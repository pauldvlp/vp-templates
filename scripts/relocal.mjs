// relocal — reset the LOCAL Verdaccio test loop in one shot:
//   1. clear the caches that serve stale copies (`pnpm dlx`, registry metadata, the @pauldvlp store
//      links, vp's resolve cache),
//   2. wipe the @pauldvlp packages from Verdaccio storage so the SAME versions can be republished,
//   3. rebuild every package,
//   4. republish every (public) package to the local registry.
//
// Needs the registry running in another terminal: `pnpm registry`.
//
//   pnpm relocal
//
// Override the registry with VP_LOCAL_REGISTRY=http://host:port pnpm relocal
//
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REGISTRY = process.env.VP_LOCAL_REGISTRY || 'http://localhost:4873';
const SCOPE = '@pauldvlp';

const log = (m) => console.log(`\n\x1b[36m▶ ${m}\x1b[0m`);
const rm = (p) => {
  if (p && fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log(`  rm ${p}`);
  }
};
const run = (cmd) => {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
};

// 0) The registry must be up — publishing fails cryptically otherwise.
log(`Checking registry ${REGISTRY}`);
const up = await fetch(REGISTRY, { signal: AbortSignal.timeout(3000) })
  .then(() => true)
  .catch(() => false);
if (!up) {
  console.error(
    `\n\x1b[31m✗ Registry not reachable at ${REGISTRY}.\x1b[0m Start it in another terminal:\n    pnpm registry\n`,
  );
  process.exit(1);
}

// 1) Wipe Verdaccio storage for the scope so same-version republishes are accepted.
log(`Clearing Verdaccio storage for ${SCOPE}`);
rm(path.join(ROOT, '.verdaccio', 'storage', SCOPE));

// 2) Clear the consumer-side caches that make `vp create` reuse the old package.
log('Clearing pnpm + vp caches');
const pnpmCache = path.join(os.homedir(), '.cache', 'pnpm');
rm(path.join(pnpmCache, 'dlx')); // `pnpm dlx` install cache (what `vp create` uses)
rm(path.join(pnpmCache, 'v11')); // registry metadata cache (forces re-fetch of the new tarball)
rm(path.join(pnpmCache, 'lockfile-verified.jsonl'));
rm(path.join(os.homedir(), '.vite-plus', 'cache', 'resolve_cache.json'));
let storePath = '';
try {
  storePath = execSync('pnpm store path', { cwd: ROOT }).toString().trim();
} catch {
  // pnpm not on PATH for store lookup — skip the targeted store cleanup, prune below still helps.
}
if (storePath) rm(path.join(storePath, 'links', SCOPE));
try {
  run('pnpm store prune');
} catch {
  // prune is best-effort; a failure here shouldn't abort the rebuild/publish.
}

// 3) Rebuild everything (bundles template-kit into each generator's dist, etc.).
log('Rebuilding all packages');
run('pnpm -r run build');

// 4) Republish every public package (private root + template-kit are skipped automatically).
log(`Publishing all packages to ${REGISTRY}`);
run(`pnpm -r publish --registry ${REGISTRY} --no-git-checks`);

log('Done — test with `vp create @pauldvlp` in a scratch dir.');
