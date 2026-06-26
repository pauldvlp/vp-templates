import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createTemplate } from 'bingo'
import { z } from 'zod'

import pkgJson from '../package.json' with { type: 'json' }

const TEMPLATE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'template')

// Files shipped with a leading underscore so `npm publish` doesn't mangle dotfiles.
const RENAME: Record<string, string> = {
  _gitignore: '.gitignore'
}

// shadcn's curated "radix-nova" theme (neutral base, yellow accent, Space Grotesk / Outfit,
// large radius). Generated at https://ui.shadcn.com — used as the default when no preset is passed.
const DEFAULT_PRESET = 'b30557okNu'

// Per icon library: the dependency added to BOTH `ui` and `website` so the app can import icons
// directly from the icon package (tree-shaken named imports). A barrel re-export from `ui`
// (`export * from '@hugeicons/core-free-icons'`) is avoided on purpose — hugeicons' icon set is
// huge and the wildcard barrel blows past Vite Task's run-cache serialization limit.
const ICON_LIBS: Record<string, Record<string, string>> = {
  hugeicons: { '@hugeicons/react': '^1.1.9', '@hugeicons/core-free-icons': '^4.2.1' },
  lucide: { 'lucide-react': '^0' },
  radix: { '@radix-ui/react-icons': '^1' },
  tabler: { '@tabler/icons-react': '^3' }
}

type Tree = { [name: string]: string | Tree }

/** `acme` → `@acme`; `@acme` → `@acme` (idempotent). */
function toScope(name: string): string {
  const n = name.trim()
  return n.startsWith('@') ? n : `@${n}`
}

/** Recursively read a directory into Bingo's nested `files` shape, applying a text transform. */
function readTree(dir: string, transform: (relPath: string, content: string) => string, base = dir): Tree {
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
function setPath(tree: Tree, relPath: string, content: string): void {
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
function patchJson(tree: Tree, relPath: string, mutate: (json: any) => void): void {
  const parts = relPath.split('/')
  let node = tree
  for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]!] as Tree
  const key = parts[parts.length - 1]!
  const json = JSON.parse(node[key] as string)
  mutate(json)
  node[key] = `${JSON.stringify(json, null, 2)}\n`
}

export default createTemplate({
  about: {
    name: pkgJson.name,
    description: pkgJson.description
  },

  options: {
    name: z.string().describe('Root project / package name').default('my-app'),
    scope: z.string().describe('npm scope for workspace packages, e.g. @acme (defaults to @<name>)'),
    base: z.enum(['radix', 'base']).describe('shadcn component library base (radix-ui or @base-ui)').default('radix'),
    preset: z
      .string()
      .describe('shadcn preset: a style name (nova, vega, maia, lyra, mira, luma, sera, rhea) or a code from ui.shadcn.com')
      .default(DEFAULT_PRESET),
    iconLibrary: z.enum(['lucide', 'hugeicons', 'radix', 'tabler']).describe('Icon library').default('hugeicons'),
    cssVariables: z.boolean().describe('Use CSS variables for theming').default(true),
    rtl: z.boolean().describe('Enable RTL support').default(false),
    pointer: z.boolean().describe('Use pointer cursor on interactive elements').default(false),
    components: z.string().describe('Comma-separated shadcn components to pre-install, e.g. button,card,dialog').default('button,badge'),
    install: z.boolean().describe('Install deps and apply the shadcn theme after scaffolding').default(true)
  },

  // Lazily default the package scope to `@<name>` (prefixing `@` unless the name already has one),
  // so it tracks the project name instead of a fixed value. Falls back to `@app` when no name is set.
  prepare({ options }) {
    return {
      scope: () => (options.name ? toScope(options.name) : '@app')
    }
  },

  async produce({ options }) {
    const scope = toScope(options.scope || options.name || 'app')

    // Read the static monorepo skeleton, rewriting the @app scope and project name.
    const files = readTree(TEMPLATE_DIR, (_rel, content) =>
      content.split('@app').join(scope).split('__PROJECT_NAME__').join(options.name)
    )

    // Bake components.json for the UI package and the website app from the chosen options.
    // The shadcn preset (applied by `shadcn init` below) is authoritative for the theme:
    // it sets `style`, `baseColor`, accent color, fonts, radius and menu styling. These baked
    // values only seed the paths, base and icon library `init` needs up front. `init` rewrites
    // the `ui` alias to `<scope>/ui/components/ui`, so `shadcn add` writes to src/components/ui/*;
    // the package `exports` map (`./components/*` -> `./src/components/*.tsx`) resolves those as
    // `<scope>/ui/components/ui/<name>`.
    const uiComponentsJson = {
      $schema: 'https://ui.shadcn.com/schema.json',
      style: `${options.base}-nova`,
      rsc: false,
      tsx: true,
      tailwind: { config: '', css: './src/styles/globals.css', baseColor: 'neutral', cssVariables: options.cssVariables },
      iconLibrary: options.iconLibrary,
      rtl: options.rtl,
      base: options.base,
      aliases: {
        components: `${scope}/ui/components`,
        ui: `${scope}/ui/components`,
        lib: `${scope}/ui/lib`,
        utils: `${scope}/ui/lib/utils`,
        hooks: `${scope}/ui/hooks`
      }
    }
    const websiteComponentsJson = {
      $schema: 'https://ui.shadcn.com/schema.json',
      style: `${options.base}-nova`,
      rsc: false,
      tsx: true,
      tailwind: { config: '', css: '../../packages/ui/src/styles/globals.css', baseColor: 'neutral', cssVariables: options.cssVariables },
      iconLibrary: options.iconLibrary,
      rtl: options.rtl,
      aliases: {
        components: '@/components',
        hooks: '@/hooks',
        lib: '@/lib',
        utils: `${scope}/ui/lib/utils`,
        ui: `${scope}/ui/components`
      }
    }
    setPath(files, 'packages/ui/components.json', `${JSON.stringify(uiComponentsJson, null, 2)}\n`)
    setPath(files, 'apps/website/components.json', `${JSON.stringify(websiteComponentsJson, null, 2)}\n`)

    // Make the chosen icon library available to both the UI package (its shadcn components use it)
    // and the website app (so it can import icons directly, e.g. `import { Home01Icon } from
    // '@hugeicons/core-free-icons'`).
    const iconDeps = ICON_LIBS[options.iconLibrary] ?? ICON_LIBS.hugeicons
    for (const rel of ['packages/ui/package.json', 'apps/website/package.json']) {
      patchJson(files, rel, (pkg) => {
        pkg.dependencies = { ...pkg.dependencies, ...iconDeps }
      })
    }

    // Always ensure button + badge exist so the starter App.tsx compiles.
    const requested = options.components
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
    const adds = Array.from(new Set(['button', 'badge', ...requested]))

    const ui = `${scope}/ui`
    const initFlags = [
      `--base ${options.base}`,
      `--preset ${options.preset}`,
      options.cssVariables ? '--css-variables' : '--no-css-variables',
      options.rtl ? '--rtl' : '--no-rtl',
      options.pointer ? '--pointer' : '--no-pointer',
      '--no-reinstall',
      '-y',
      '-f'
    ].join(' ')

    const scripts = options.install
      ? [
          { commands: ['pnpm install --silent'], phase: 0 },
          { commands: [`pnpm --filter ${ui} exec shadcn init ${initFlags}`], phase: 1 },
          { commands: [`pnpm --filter ${ui} exec shadcn add ${adds.join(' ')} -y`], phase: 2 }
        ]
      : []

    return {
      files,
      scripts,
      suggestions: [
        `cd into the project and run \`vp run ${scope}/website#dev\` to start the app.`,
        options.install
          ? `Theme applied via shadcn preset "${options.preset}". Re-theme any time: \`pnpm --filter ${ui} exec shadcn init --preset <code> --no-reinstall -y -f\`.`
          : `Skipped install. Run \`vp install\`, then \`pnpm --filter ${ui} exec shadcn init --preset ${options.preset} --no-reinstall -y -f\` and \`shadcn add ${adds.join(' ')}\`.`,
        `Add more components later: \`pnpm --filter ${ui} exec shadcn add <name>\`.`
      ]
    }
  }
})
