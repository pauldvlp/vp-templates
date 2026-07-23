// Published-artifact smoke: packs every publishable package and installs the REAL tarball into a
// clean project outside the workspace, then exercises it there.
//
// This is the gap `pnpm smoke:install` does not cover. That script imports
// `packages/<pkg>/src/template.ts` straight out of the workspace, so it validates the sources — never
// the thing npm actually ships. Everything below is invisible to it:
//
//   - a missing `files` entry (the `template/` payload not shipping, so the CLI installs and then
//     fails on the first generate),
//   - a `bin` that doesn't resolve or won't start,
//   - a bare import in `dist` that isn't a declared dependency, so `npm install` leaves it
//     unresolvable on a user's machine.
//
// The last one is the reason this exists. Each generator is bundled with esbuild
// `--packages=external`, which keeps EVERY bare specifier external; the private, never-published
// `@pauldvlp/template-kit` stays out of that only because a tsconfig `paths` match rewrites it to a
// relative path before esbuild classifies it. That is a single line of config holding up the whole
// published bundle. If it ever stops matching, `dist/index.js` gets `import ... from
// '@pauldvlp/template-kit'`, npm cannot resolve it because the package does not exist on the
// registry, and every install of every generator breaks — while the workspace build, the unit tests
// and `smoke:install` all stay green, because inside the workspace that import resolves fine.
//
//   pnpm smoke:tarball
//
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: 'pipe', ...opts });

const failures = [];
const fail = (pkg, message) => {
  failures.push(`${pkg}: ${message}`);
  console.error(`  ✗ ${message}`);
};
const pass = (message) => console.error(`  ✓ ${message}`);

/** Every workspace package npm would actually publish, plus the private ones we must never ship. */
function readWorkspace() {
  const dirs = fs
    .readdirSync(path.join(ROOT, 'packages'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(ROOT, 'packages', e.name));

  const all = dirs.map((dir) => ({
    dir,
    manifest: JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')),
  }));

  return {
    publishable: all.filter((p) => p.manifest.private !== true),
    private: all.filter((p) => p.manifest.private === true).map((p) => p.manifest.name),
  };
}

/**
 * Does `code` reference `pkg` as a module specifier?
 *
 * Deliberately NOT a general import parser. An earlier version scanned for every bare specifier and
 * tripped over prose inside a help string — the generators print `Import the styles import
 * '${ui}/globals.css'`, which reads exactly like an import statement to a regex. So this asks a much
 * narrower question with no ambiguity: does the EXACT private package name appear as a quoted
 * specifier anywhere? Inlining is supposed to erase the name from the bundle entirely, so any
 * occurrence at all is the failure. Whether the remaining imports RESOLVE is not guessed at here —
 * running the bin from the clean install answers that authoritatively.
 */
function referencesPackage(code, pkg) {
  const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`["'\`]${escaped}(?:/[^"'\`]*)?["'\`]`).test(code);
}

const { publishable, private: privateNames } = readWorkspace();
const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-tarball-'));
const tarballs = path.join(workdir, 'tarballs');
fs.mkdirSync(tarballs);

console.error(`workdir: ${workdir}`);
console.error(
  `private packages that must never be imported: ${privateNames.join(', ') || 'none'}\n`,
);

for (const { dir, manifest } of publishable) {
  const name = manifest.name;
  console.error(`── ${name}@${manifest.version}`);

  // `pnpm pack` runs prepack, which builds. This is the same path `changeset publish` takes.
  let tarball;
  try {
    const out = run('pnpm', ['pack', '--pack-destination', tarballs], { cwd: dir });
    tarball = out.trim().split('\n').pop().trim();
  } catch (err) {
    fail(name, `pack failed: ${err.stderr || err.message}`);
    continue;
  }
  if (!fs.existsSync(tarball)) {
    fail(name, `pack reported ${tarball}, which does not exist`);
    continue;
  }
  pass(`packed ${path.basename(tarball)}`);

  // A clean project outside the workspace: no pnpm workspace linking, no hoisted node_modules to
  // accidentally satisfy an import the tarball failed to declare.
  const consumer = path.join(workdir, `consume-${path.basename(dir)}`);
  fs.mkdirSync(consumer);
  fs.writeFileSync(
    path.join(consumer, 'package.json'),
    JSON.stringify({ name: 'consumer', version: '1.0.0', private: true }, null, 2),
  );
  try {
    run('npm', ['install', '--no-audit', '--no-fund', tarball], { cwd: consumer });
  } catch (err) {
    fail(name, `npm install of the tarball failed: ${err.stderr || err.message}`);
    continue;
  }
  pass('installed into a clean project');

  const installed = path.join(consumer, 'node_modules', ...name.split('/'));

  // Everything `files` promised actually arrived.
  for (const entry of manifest.files ?? []) {
    if (fs.existsSync(path.join(installed, entry))) pass(`shipped ${entry}/`);
    else fail(name, `\`files\` lists "${entry}" but it is absent from the tarball`);
  }

  // The bundle's imports must all be resolvable from the published manifest alone.
  const binRel =
    typeof manifest.bin === 'string' ? manifest.bin : Object.values(manifest.bin ?? {})[0];
  if (binRel) {
    const binPath = path.join(installed, binRel);
    if (!fs.existsSync(binPath)) {
      fail(name, `\`bin\` points at ${binRel}, which is not in the tarball`);
    } else {
      const bundle = fs.readFileSync(binPath, 'utf8');
      const leaked = privateNames.filter((p) => referencesPackage(bundle, p));
      if (leaked.length) {
        fail(
          name,
          `${binRel} still names ${leaked.join(', ')} — a PRIVATE workspace package that is never ` +
            `published. The tsconfig \`paths\` inlining stopped matching, so npm cannot resolve it ` +
            `and every install of this generator is broken.`,
        );
      } else {
        pass('no private workspace package survives in the bundle');
      }

      // The authoritative resolution check: Node loads the whole bundle from a clean install, so any
      // static import that npm could not satisfy throws ERR_MODULE_NOT_FOUND right here. `--help`
      // returns 0 without prompting, so it exercises the entry without hanging on a TTY read.
      try {
        run(process.execPath, [binPath, '--help'], { cwd: consumer });
        pass('`--help` runs from the installed tarball — every static import resolved');
      } catch (err) {
        fail(name, `running the installed bin failed: ${err.stderr || err.message}`);
      }
    }
  }

  // The index package is pure data: every template it advertises must be a package we publish.
  for (const entry of manifest.createConfig?.templates ?? []) {
    const known = publishable.some((p) => p.manifest.name === entry.template);
    if (known) pass(`indexes ${entry.template}`);
    else fail(name, `createConfig points at "${entry.template}", which this repo does not publish`);
  }

  console.error('');
}

fs.rmSync(workdir, { recursive: true, force: true });

if (failures.length) {
  console.error(`\n${failures.length} tarball check(s) failed:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.error(`All tarball checks passed for ${publishable.length} published packages.`);
