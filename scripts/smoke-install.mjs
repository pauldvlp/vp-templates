// Real-install smoke: scaffolds a generator to disk and actually runs its post-scaffold scripts so
// a broken dependency bump (in template/**/package.json, the template's catalog, or src/template.ts's
// ICON_LIBS) surfaces as an install/build failure instead of slipping into a published template.
//
// Unlike `pnpm smoke` (which only asserts the in-memory file tree and never installs), this hits the
// real npm registry. Because the generated project has no lockfile and uses version *ranges*, a fresh
// install pulls the newest matching release — so running this on a schedule also catches a dependency
// that published a breaking version inside an allowed range.
//
//   pnpm smoke:install         # scaffold + `pnpm install` only (dependency-resolution gate)
//   pnpm smoke:install --full  # also run shadcn init/add + `pnpm run build` (typecheck + bundle)
//
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT = path.join(ROOT, '.smoke-install')
const FULL = process.argv.includes('--full')

const cases = [
  {
    pkg: 'vp-react-ts-shadcn',
    options: {
      name: 'acme-web', scope: '@acme', base: 'base', preset: 'vega', iconLibrary: 'lucide',
      cssVariables: true, rtl: false, pointer: false, components: 'button,badge,card', install: true
    }
  },
  {
    pkg: 'vp-react-ts-nestjs',
    options: { name: 'acme', scope: '@acme', apiPort: '3000', webPort: '5173', swagger: true, serveWeb: true, docker: true, install: true }
  }
]

/** Write the nested `files` tree to disk. */
function write(node, dir) {
  for (const [k, v] of Object.entries(node)) {
    const p = path.join(dir, k)
    if (typeof v === 'string') {
      fs.mkdirSync(path.dirname(p), { recursive: true })
      fs.writeFileSync(p, v)
    } else {
      fs.mkdirSync(p, { recursive: true })
      write(v, p)
    }
  }
}

function run(cmd, cwd) {
  console.log(`  $ ${cmd}`)
  // Run through a shell so the emitted scripts (which are full command strings) work verbatim.
  execFileSync(cmd, { cwd, stdio: 'inherit', shell: true })
}

fs.rmSync(OUT, { recursive: true, force: true })
let failed = 0
for (const c of cases) {
  const dir = path.join(OUT, c.pkg)
  console.log(`\n▶ ${c.pkg} (${FULL ? 'full: install + shadcn + build' : 'install only'})`)
  try {
    const { default: template } = await import(path.join(ROOT, 'packages', c.pkg, 'src', 'template.ts'))
    const { files, scripts } = await template.produce({ options: c.options })
    write(files, dir)

    // The post-scaffold scripts come back grouped by phase: phase 0 = `pnpm install`, then shadcn
    // init/add. Run phase 0 always; the rest only with --full (they hit shadcn registries + need a
    // build to be meaningful).
    const ordered = [...scripts].sort((a, b) => a.phase - b.phase)
    for (const step of ordered) {
      if (!FULL && step.phase !== 0) continue
      for (const cmd of step.commands) run(cmd, dir)
    }
    // `pnpm run build` (= `vp run -r build`, includes the website's `tsc -b`) proves the project
    // typechecks and bundles after a real install. We deliberately do NOT run `vp check`/`pnpm run
    // ready` here: that gate also formats/lints, and shadcn-generated components don't match oxfmt's
    // style — a formatting nit is noise for a dependency-drift smoke.
    if (FULL) run('pnpm run build', dir)

    console.log(`✓ ${c.pkg} installed cleanly`)
    fs.rmSync(dir, { recursive: true, force: true })
  } catch (err) {
    failed++
    console.error(`✗ ${c.pkg}: ${err.message}`)
    console.error(`  kept generated project at ${dir} for inspection`)
  }
}
console.log(failed ? `\n${failed} install smoke(s) failed` : '\nAll install smokes passed')
process.exit(failed ? 1 : 0)
