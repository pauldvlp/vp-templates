// Fast inner-loop check: exercises a generator's produce() without a registry, npm install, or
// shadcn. Verifies the emitted file tree, scope/name substitution, and per-option wiring. For the
// full `vp create @pauldvlp:...` path see DEVELOPMENT.md (Verdaccio).
//
//   pnpm smoke
//
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT = path.join(ROOT, '.smoke')

const cases = [
  {
    pkg: 'vp-react-ts-shadcn',
    options: { name: 'acme-web', scope: '@acme', base: 'base', preset: 'vega', iconLibrary: 'lucide', cssVariables: true, rtl: false, pointer: false, components: 'button,badge,card', install: true },
    expect(files) {
      assert.equal(JSON.parse(files['package.json']).name, 'acme-web', 'root package name')
      assert.equal(JSON.parse(files.packages.ui['package.json']).name, '@acme/ui', 'ui package name')
      assert.match(files.apps.website.src['App.tsx'], /@acme\/ui\/components\/ui\/button/, 'App imports scoped ui')
      const uiDeps = JSON.parse(files.packages.ui['package.json']).dependencies
      const webDeps = JSON.parse(files.apps.website['package.json']).dependencies
      assert.ok(uiDeps['lucide-react'], 'ui has chosen icon lib')
      assert.ok(webDeps['lucide-react'], 'website has chosen icon lib')
    }
  },
  {
    pkg: 'vp-pkg-shadcn',
    options: { scope: '@acme', base: 'base', preset: 'vega', iconLibrary: 'lucide', cssVariables: true, rtl: false, pointer: false, components: 'button,badge,card', install: true },
    expect(files) {
      // Add-into-existing: emits the UI package contents at the ROOT of the tree (Bingo nests them
      // under the chosen --directory). No `packages/ui` wrapper, no apps, no root-monorepo package.json.
      assert.ok(!files.packages, 'does not nest under packages/* (would double to packages/ui/packages/ui)')
      assert.ok(!files.apps, 'does not emit apps')
      assert.ok(files['package.json'], 'emits the ui package.json at root')
      assert.ok(files['components.json'], 'emits components.json at root')
      assert.ok(files.src?.styles?.['globals.css'], 'emits src/styles/globals.css')
      const uiPkg = JSON.parse(files['package.json'])
      assert.equal(uiPkg.name, '@acme/ui', 'ui package name')
      assert.ok(uiPkg.dependencies['lucide-react'], 'ui has chosen icon lib')
      // catalog: specifiers must be resolved (no root catalog in a target repo).
      const allRanges = Object.values({ ...uiPkg.dependencies, ...uiPkg.devDependencies })
      assert.ok(!allRanges.some((r) => String(r).startsWith('catalog:')), 'catalog: specifiers resolved')
      assert.equal(uiPkg.devDependencies['vite-plus'], '^0.2.1', 'vite-plus resolved from catalog')
      assert.match(files['components.json'], /"style": "base-nova"/, 'components.json baked from base')
      assert.match(files['components.json'], /@acme\/ui\/components/, 'components.json aliases use the scope')
    }
  }
]

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

fs.rmSync(OUT, { recursive: true, force: true })
let failed = 0
for (const c of cases) {
  const { default: template } = await import(path.join(ROOT, 'packages', c.pkg, 'src', 'template.ts'))
  try {
    const { files, scripts } = await template.produce({ options: c.options })
    c.expect(files)
    assert.ok(Array.isArray(scripts) && scripts.length > 0, 'emits post-scaffold scripts')
    write(files, path.join(OUT, c.pkg))
    console.log(`✓ ${c.pkg}`)
  } catch (err) {
    failed++
    console.error(`✗ ${c.pkg}: ${err.message}`)
  }
}
fs.rmSync(OUT, { recursive: true, force: true })
console.log(failed ? `\n${failed} smoke check(s) failed` : '\nAll smoke checks passed')
process.exit(failed ? 1 : 0)
