import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  addIconDeps,
  appComponentsJson,
  DEFAULT_PRESET,
  defineTemplate,
  dirName,
  patchJson,
  readTree,
  setPath,
  shadcnInitFlags,
  toScope,
  uiComponentsJson,
  withRequiredComponents
} from '@pauldvlp/template-kit'

import pkgJson from '../package.json' with { type: 'json' }

const TEMPLATE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'template')

interface Options {
  name: string
  scope: string
  base: 'radix' | 'base'
  preset: string
  iconLibrary: 'lucide' | 'hugeicons' | 'radix' | 'tabler'
  cssVariables: boolean
  rtl: boolean
  pointer: boolean
  components: string
  install: boolean
}

export default defineTemplate<Options>({
  about: {
    name: pkgJson.name,
    description: pkgJson.description
  },

  options: [
    // Default the name to the target directory the user chose, so they don't retype it.
    { key: 'name', type: 'string', message: 'Root project / package name', default: ({ directory }) => dirName(directory) },
    // Lazily default the package scope to `@<name>` (prefixing `@` unless the name already has one),
    // so it tracks the project name instead of a fixed value. Falls back to `@app` when no name is set.
    { key: 'scope', type: 'string', message: 'npm scope for workspace packages, e.g. @acme (defaults to @<name>)', default: ({ options }) => (options.name ? toScope(options.name) : '@app') },
    { key: 'base', type: 'select', message: 'shadcn component library base (radix-ui or @base-ui)', choices: ['radix', 'base'], default: 'radix' },
    { key: 'preset', type: 'string', message: 'shadcn preset: a style name (nova, vega, maia, lyra, mira, luma, sera, rhea) or a code from ui.shadcn.com', default: DEFAULT_PRESET },
    { key: 'iconLibrary', type: 'select', message: 'Icon library', choices: ['lucide', 'hugeicons', 'radix', 'tabler'], default: 'hugeicons' },
    { key: 'cssVariables', type: 'boolean', message: 'Use CSS variables for theming', default: true },
    { key: 'rtl', type: 'boolean', message: 'Enable RTL support', default: false },
    { key: 'pointer', type: 'boolean', message: 'Use pointer cursor on interactive elements', default: false },
    { key: 'components', type: 'string', message: 'Comma-separated shadcn components to pre-install, e.g. button,card,dialog', default: 'button,badge' },
    { key: 'install', type: 'boolean', message: 'Install deps and apply the shadcn theme after scaffolding', default: true }
  ],

  async produce({ options }) {
    const scope = toScope(options.scope || options.name || 'app')

    // Read the static monorepo skeleton, rewriting the @app scope and project name.
    const files = readTree(TEMPLATE_DIR, (_rel, content) =>
      content.split('@app').join(scope).split('__PROJECT_NAME__').join(options.name)
    )

    // Bake components.json for the UI package and the website app from the chosen options. The shadcn
    // preset (applied by `shadcn init` below) is authoritative for the theme; these baked values only
    // seed the paths, base and icon library `init` needs up front.
    setPath(files, 'packages/ui/components.json', `${JSON.stringify(uiComponentsJson({ ...options, scope }), null, 2)}\n`)
    setPath(
      files,
      'apps/website/components.json',
      `${JSON.stringify(appComponentsJson({ ...options, scope, cssPath: '../../packages/ui/src/styles/globals.css' }), null, 2)}\n`
    )

    // Make the chosen icon library available to both the UI package (its shadcn components use it)
    // and the website app (so it can import icons directly, e.g. `import { Home01Icon } from
    // '@hugeicons/core-free-icons'`).
    for (const rel of ['packages/ui/package.json', 'apps/website/package.json']) {
      patchJson(files, rel, (pkg) => addIconDeps(pkg, options.iconLibrary))
    }

    // Always ensure button + badge exist so the starter App.tsx compiles.
    const adds = withRequiredComponents(options.components)

    const ui = `${scope}/ui`
    const initFlags = shadcnInitFlags(options)

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
