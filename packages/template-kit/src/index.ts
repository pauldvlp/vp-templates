import fs from 'node:fs'
import path from 'node:path'

/** Bingo's nested `files` shape: a directory is an object, a file is its string content. */
export type Tree = { [name: string]: string | Tree }

// Files shipped with a leading underscore so `npm publish` doesn't mangle dotfiles.
export const RENAME: Record<string, string> = {
  _gitignore: '.gitignore'
}

// shadcn's curated "radix-nova" theme (neutral base, yellow accent, Space Grotesk / Outfit,
// large radius). Generated at https://ui.shadcn.com — used as the default when no preset is passed.
export const DEFAULT_PRESET = 'b30557okNu'

// Per icon library: the dependency added so a package can import icons directly (tree-shaken named
// imports). A barrel re-export from `ui` (`export * from '@hugeicons/core-free-icons'`) is avoided on
// purpose — hugeicons' icon set is huge and the wildcard barrel blows past Vite Task's run-cache
// serialization limit.
export const ICON_LIBS: Record<string, Record<string, string>> = {
  hugeicons: { '@hugeicons/react': '^1.1.9', '@hugeicons/core-free-icons': '^4.2.1' },
  lucide: { 'lucide-react': '^0' },
  radix: { '@radix-ui/react-icons': '^1' },
  tabler: { '@tabler/icons-react': '^3' }
}

// The template monorepo's `catalog:` entries (kept in sync with vp-react-ts-shadcn's
// template/pnpm-workspace.yaml). Generators that drop a package into an *existing* repo can't rely
// on the target's catalog, so they resolve `catalog:` specifiers to these concrete ranges.
export const CATALOG: Record<string, string> = {
  '@types/node': '^24',
  typescript: '^5',
  vite: 'npm:@voidzero-dev/vite-plus-core@latest',
  vitest: '4.1.9',
  'vite-plus': '^0.2.1',
  'babel-plugin-react-compiler': '^1.0.0',
  '@rolldown/plugin-babel': '^0.2.3'
}

/** `acme` → `@acme`; `@acme` → `@acme` (idempotent). */
export function toScope(name: string): string {
  const n = name.trim()
  return n.startsWith('@') ? n : `@${n}`
}

/**
 * Derive the workspace npm scope from the monorepo the cwd sits in: walk up to the nearest
 * `pnpm-workspace.yaml` and read its sibling `package.json` name (e.g. root `"acme"` → `@acme`,
 * `"@acme/root"` → `@acme`). Returns undefined outside a pnpm workspace.
 */
export function detectMonorepoScope(): string | undefined {
  let dir = process.cwd()
  for (let i = 0; i < 10; i++) {
    const hasWorkspace = fs.existsSync(path.join(dir, 'pnpm-workspace.yaml')) || fs.existsSync(path.join(dir, 'pnpm-workspace.yml'))
    const pkgPath = path.join(dir, 'package.json')
    if (hasWorkspace && fs.existsSync(pkgPath)) {
      try {
        const name = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).name
        if (typeof name === 'string' && name) {
          const head = name.startsWith('@') ? name.slice(1).split('/')[0]! : name
          return toScope(head)
        }
      } catch {
        // ignore malformed package.json and keep walking up
      }
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return undefined
}

/** Recursively read a directory into Bingo's nested `files` shape, applying a text transform. */
export function readTree(dir: string, transform: (relPath: string, content: string) => string, base = dir): Tree {
  const out: Tree = {}
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    const name = RENAME[entry.name] ?? entry.name
    if (entry.isDirectory()) {
      out[name] = readTree(abs, transform, base)
    } else {
      const rel = path.relative(base, abs)
      out[name] = transform(rel, fs.readFileSync(abs, 'utf8'))
    }
  }
  return out
}

/** Set a nested path (e.g. "packages/ui/components.json") in a Tree. */
export function setPath(tree: Tree, relPath: string, content: string): void {
  const parts = relPath.split('/')
  let node = tree
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!
    if (typeof node[key] !== 'object') node[key] = {}
    node = node[key] as Tree
  }
  node[parts[parts.length - 1]!] = content
}

/** Parse, mutate and re-serialize a JSON file already present in a Tree. */
export function patchJson(tree: Tree, relPath: string, mutate: (json: any) => void): void {
  const parts = relPath.split('/')
  let node = tree
  for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]!] as Tree
  const key = parts[parts.length - 1]!
  const json = JSON.parse(node[key] as string)
  mutate(json)
  node[key] = `${JSON.stringify(json, null, 2)}\n`
}

/** Replace `catalog:` specifiers with concrete versions from `catalog` across a parsed package.json. */
export function resolveCatalogDeps(pkg: any, catalog: Record<string, string> = CATALOG): void {
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const deps = pkg[field]
    if (!deps) continue
    for (const [name, range] of Object.entries(deps)) {
      if ((range === 'catalog:' || range === 'catalog:default') && catalog[name]) deps[name] = catalog[name]
    }
  }
}

/** Merge the chosen icon library's dependency into a parsed package.json's `dependencies`. */
export function addIconDeps(pkg: any, iconLibrary: string): void {
  const iconDeps = ICON_LIBS[iconLibrary] ?? ICON_LIBS.hugeicons
  pkg.dependencies = { ...pkg.dependencies, ...iconDeps }
}

/** Expand a comma-separated component list, always including `required` ones so the starter compiles. */
export function withRequiredComponents(csv: string, required: string[] = ['button', 'badge']): string[] {
  const requested = csv
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
  return Array.from(new Set([...required, ...requested]))
}

export type ShadcnTheme = {
  scope: string
  base: string
  cssVariables: boolean
  iconLibrary: string
  rtl: boolean
}

/**
 * `components.json` for the shared `ui` package. The shadcn preset (applied by `shadcn init`) is
 * authoritative for the theme; these baked values only seed the paths, base and icon library that
 * `init` needs up front. `init` rewrites the `ui` alias to `<scope>/ui/components/ui`, so
 * `shadcn add` writes to src/components/ui/*, resolved through the package `exports` map.
 */
export function uiComponentsJson(theme: ShadcnTheme): object {
  const { scope, base, cssVariables, iconLibrary, rtl } = theme
  return {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: `${base}-nova`,
    rsc: false,
    tsx: true,
    tailwind: { config: '', css: './src/styles/globals.css', baseColor: 'neutral', cssVariables },
    iconLibrary,
    rtl,
    base,
    aliases: {
      components: `${scope}/ui/components`,
      ui: `${scope}/ui/components`,
      lib: `${scope}/ui/lib`,
      utils: `${scope}/ui/lib/utils`,
      hooks: `${scope}/ui/hooks`
    }
  }
}

/** `components.json` for a consuming app (its own components live under `@/`, ui sourced from `<scope>/ui`). */
export function appComponentsJson(theme: ShadcnTheme & { cssPath: string }): object {
  const { scope, base, cssVariables, iconLibrary, rtl, cssPath } = theme
  return {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: `${base}-nova`,
    rsc: false,
    tsx: true,
    tailwind: { config: '', css: cssPath, baseColor: 'neutral', cssVariables },
    iconLibrary,
    rtl,
    aliases: {
      components: '@/components',
      hooks: '@/hooks',
      lib: '@/lib',
      utils: `${scope}/ui/lib/utils`,
      ui: `${scope}/ui/components`
    }
  }
}

export type ShadcnInitOpts = {
  base: string
  preset: string
  cssVariables: boolean
  rtl: boolean
  pointer: boolean
}

/** Build the `shadcn init` flag string shared by both generators. */
export function shadcnInitFlags(opts: ShadcnInitOpts): string {
  return [
    `--base ${opts.base}`,
    `--preset ${opts.preset}`,
    opts.cssVariables ? '--css-variables' : '--no-css-variables',
    opts.rtl ? '--rtl' : '--no-rtl',
    opts.pointer ? '--pointer' : '--no-pointer',
    '--no-reinstall',
    '-y',
    '-f'
  ].join(' ')
}
