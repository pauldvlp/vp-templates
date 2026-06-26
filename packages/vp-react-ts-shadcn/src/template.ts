import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  addIconDeps,
  appComponentsJson,
  DEFAULT_PRESET,
  patchJson,
  readTree,
  setPath,
  shadcnInitFlags,
  toScope,
  uiComponentsJson,
  withRequiredComponents
} from '@pauldvlp/template-kit'
import { createTemplate } from 'bingo'
import { z } from 'zod'

import pkgJson from '../package.json' with { type: 'json' }

const TEMPLATE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'template')

export default createTemplate({
  about: {
    name: pkgJson.name,
    description: pkgJson.description
  },

  options: {
    name: z.string().describe('Root project / package name').default('my-app'),
    scope: z.string().describe('npm scope for workspace packages, e.g. @acme (defaults to @<name>)'),
    // Unions of literals (not z.enum) so the value is settable on Bingo's CLI: bingo's arg parser
    // handles ZodUnion/ZodLiteral but not ZodEnum (a bare `--base radix` would otherwise mis-parse to
    // `base: true`). Both still render as an interactive `select`.
    base: z.union([z.literal('radix'), z.literal('base')]).describe('shadcn component library base (radix-ui or @base-ui)').default('radix'),
    preset: z
      .string()
      .describe('shadcn preset: a style name (nova, vega, maia, lyra, mira, luma, sera, rhea) or a code from ui.shadcn.com')
      .default(DEFAULT_PRESET),
    iconLibrary: z
      .union([z.literal('lucide'), z.literal('hugeicons'), z.literal('radix'), z.literal('tabler')])
      .describe('Icon library')
      .default('hugeicons'),
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
