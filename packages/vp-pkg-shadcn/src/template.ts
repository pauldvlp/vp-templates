import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  addIconDeps,
  DEFAULT_PRESET,
  detectMonorepoScope,
  patchJson,
  readTree,
  resolveCatalogDeps,
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
    scope: z.string().describe('npm scope for the workspace package, e.g. @acme').default('@app'),
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

  // Default the scope to the surrounding monorepo's scope (e.g. `@acme`) so it tracks the repo
  // instead of a fixed `@app`. Falls back to `@app` when run outside a pnpm workspace.
  prepare() {
    const monorepoScope = detectMonorepoScope()
    return {
      scope: () => monorepoScope ?? '@app'
    }
  },

  async produce({ options }) {
    const scope = toScope(options.scope || 'app')

    // Emit the UI package contents at the root of the tree (NOT nested under packages/ui): Bingo
    // writes them under the chosen `--directory` (e.g. `packages/ui`), so nesting here would double
    // it to `packages/ui/packages/ui`. Rewrite the @app scope placeholder while reading.
    const files = readTree(TEMPLATE_DIR, (_rel, content) => content.split('@app').join(scope))

    // This generator drops into an *existing* repo, so it can't rely on the target's pnpm catalog:
    // resolve the package's `catalog:` specifiers to concrete ranges, then add the chosen icon library.
    patchJson(files, 'package.json', (pkg) => {
      resolveCatalogDeps(pkg)
      addIconDeps(pkg, options.iconLibrary)
    })

    // Bake components.json from the chosen options. The shadcn preset (applied by `shadcn init` below)
    // is authoritative for the theme; these baked values only seed the paths, base and icon library
    // `init` needs up front.
    setPath(files, 'components.json', `${JSON.stringify(uiComponentsJson({ ...options, scope }), null, 2)}\n`)

    // Always ensure button + badge exist so a consuming app can import them out of the box.
    const adds = withRequiredComponents(options.components)

    const ui = `${scope}/ui`
    const initFlags = shadcnInitFlags(options)

    // Post-scaffold steps run with the new package as cwd, inside the existing workspace, so a
    // root-level `pnpm install` links it and the `--filter <scope>/ui` steps resolve.
    const scripts = options.install
      ? [
          { commands: ['pnpm install --silent'], phase: 0 },
          { commands: [`pnpm --filter ${ui} exec shadcn init ${initFlags}`], phase: 1 },
          { commands: [`pnpm --filter ${ui} exec shadcn add ${adds.join(' ')} -y`], phase: 2 }
        ]
      : []

    // Note: post-scaffold guidance is rendered by the generator's `bin` (a highlighted note, with an
    // acknowledge-to-continue prompt on interactive runs) instead of Bingo's plain-text `suggestions`,
    // which the host buries under its own prompts. See bin/index.ts.
    return {
      files,
      scripts
    }
  }
})
