// Guarded publish for release.yml. The changesets action runs its `publish` command on every push to
// `main` that has no pending changesets — including routine test/ci/docs merges where every version is
// already on npm. In that case `changeset publish` should be a no-op, but it misreads the registry,
// tries to republish existing versions, and @changesets/cli@2.31.0 crashes in isAlreadyPublishedError
// (`TypeError: Cannot read properties of undefined (reading 'includes')`), turning the run red.
//
// This wrapper only delegates to `changeset publish` when a publishable version is genuinely missing
// from npm. A no-changeset merge with nothing new to ship exits 0 without touching the registry; a
// real release (a merged "Version Packages" PR) publishes exactly as before, so the changesets action
// still parses the "New tag:" lines it needs to create git tags + GitHub Releases.
import { execFileSync, spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const PKGS = path.join(ROOT, 'packages')

// Every non-private package under packages/* is publishable (template-kit is `private`).
const publishable = readdirSync(PKGS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    try {
      return JSON.parse(readFileSync(path.join(PKGS, d.name, 'package.json'), 'utf8'))
    } catch {
      return null
    }
  })
  .filter((pkg) => pkg && pkg.name && pkg.version && !pkg.private)

const unpublished = publishable.filter((pkg) => {
  // `npm view pkg@version version` prints the version when that exact version exists on npm, and
  // nothing (or an E404) when it doesn't.
  const res = spawnSync('npm', ['view', `${pkg.name}@${pkg.version}`, 'version'], { encoding: 'utf8' })
  if (res.status === 0) return res.stdout.trim() === '' // exists → published; empty → not yet
  const err = `${res.stderr ?? ''}${res.error ? ` ${res.error}` : ''}`
  if (/E404|404 Not Found|No match found/i.test(err)) return true // not on npm → publish it
  // Ambiguous failure (network/auth). Fail loudly rather than risk republishing over an existing
  // version and re-triggering the crash this wrapper exists to avoid.
  throw new Error(`npm view ${pkg.name}@${pkg.version} failed:\n${err.trim()}`)
})

if (unpublished.length === 0) {
  console.log('All publishable packages are already on npm — nothing to publish.')
  process.exit(0)
}

console.log(`Publishing ${unpublished.length} package(s) not yet on npm:`)
for (const pkg of unpublished) console.log(`  - ${pkg.name}@${pkg.version}`)
// Delegate the actual publish so the changesets action still sees the "New tag:" lines it parses to
// create git tags + GitHub Releases. `changeset publish` skips packages already on npm on its own.
execFileSync('pnpm', ['exec', 'changeset', 'publish'], { stdio: 'inherit' })
