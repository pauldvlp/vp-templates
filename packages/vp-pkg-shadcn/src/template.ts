import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  addIconDeps,
  DEFAULT_PRESET,
  defineTemplate,
  detectMonorepoScope,
  patchJson,
  readTree,
  resolveCatalogDeps,
  setPath,
  shadcnInitArgs,
  toScope,
  uiComponentsJson,
  validateComponents,
  validatePreset,
  validateScope,
  withRequiredComponents,
} from '@pauldvlp/template-kit';

const TEMPLATE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'template');

// Read the package's own name/description at runtime rather than statically importing package.json:
// a static import makes esbuild inline the entire manifest — repository/homepage/bugs URLs included —
// into the published bundle, where they show up as stray URL strings. Resolves to the package root in
// both `node bin/index.ts` (dev) and the bundled `dist/index.js`, since each sits one level under it.
const { name: pkgName, description: pkgDescription } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { name: string; description: string };

interface Options {
  scope: string;
  base: 'radix' | 'base';
  preset: string;
  iconLibrary: 'lucide' | 'hugeicons' | 'radix' | 'tabler';
  cssVariables: boolean;
  rtl: boolean;
  pointer: boolean;
  components: string;
  install: boolean;
}

export default defineTemplate<Options>({
  about: {
    name: pkgName,
    description: pkgDescription,
  },

  // This generator drops a package into an *existing* repo, so it must never create a git repo of its own.
  git: false,

  options: [
    // Default the scope to the surrounding monorepo's scope (e.g. `@acme`) so it tracks the repo
    // instead of a fixed `@app`. Falls back to `@app` when run outside a pnpm workspace.
    {
      key: 'scope',
      type: 'string',
      message: 'npm scope for the workspace package, e.g. @acme',
      default: () => detectMonorepoScope() ?? '@app',
      validate: validateScope,
    },
    {
      key: 'base',
      type: 'select',
      message: 'shadcn component library base (radix-ui or @base-ui)',
      choices: ['radix', 'base'],
      default: 'radix',
    },
    {
      key: 'preset',
      type: 'string',
      message:
        'shadcn preset: a style name (nova, vega, maia, lyra, mira, luma, sera, rhea) or a code from ui.shadcn.com',
      default: DEFAULT_PRESET,
      validate: validatePreset,
    },
    {
      key: 'iconLibrary',
      type: 'select',
      message: 'Icon library',
      choices: ['lucide', 'hugeicons', 'radix', 'tabler'],
      default: 'hugeicons',
    },
    {
      key: 'cssVariables',
      type: 'boolean',
      message: 'Use CSS variables for theming',
      default: true,
    },
    { key: 'rtl', type: 'boolean', message: 'Enable RTL support', default: false },
    {
      key: 'pointer',
      type: 'boolean',
      message: 'Use pointer cursor on interactive elements',
      default: false,
    },
    {
      key: 'components',
      type: 'string',
      message: 'Comma-separated shadcn components to pre-install, e.g. button,card,dialog',
      default: 'button,badge',
      validate: validateComponents,
    },
    {
      key: 'install',
      type: 'boolean',
      message: 'Install deps and apply the shadcn theme after scaffolding',
      default: true,
    },
  ],

  async produce({ options }) {
    const scope = toScope(options.scope || 'app');

    // Emit the UI package contents at the root of the tree (NOT nested under packages/ui): the runtime
    // writes them under the chosen `--directory` (e.g. `packages/ui`), so nesting here would double
    // it to `packages/ui/packages/ui`. Rewrite the @app scope placeholder while reading.
    const files = readTree(TEMPLATE_DIR, (_rel, content) => content.split('@app').join(scope));

    // This generator drops into an *existing* repo, so it can't rely on the target's pnpm catalog:
    // resolve the package's `catalog:` specifiers to concrete ranges, then add the chosen icon library.
    patchJson(files, 'package.json', (pkg) => {
      resolveCatalogDeps(pkg);
      addIconDeps(pkg, options.iconLibrary);
    });

    // Bake components.json from the chosen options. The shadcn preset (applied by `shadcn init` below)
    // is authoritative for the theme; these baked values only seed the paths, base and icon library
    // `init` needs up front.
    setPath(
      files,
      'components.json',
      `${JSON.stringify(uiComponentsJson({ ...options, scope }), null, 2)}\n`,
    );

    // Always ensure button + badge exist so a consuming app can import them out of the box.
    const adds = withRequiredComponents(options.components);

    const ui = `${scope}/ui`;
    const initArgs = shadcnInitArgs(options);

    // Post-scaffold steps run with the new package as cwd, inside the existing workspace, so a
    // root-level `pnpm install` links it and the `--filter <scope>/ui` steps resolve.
    const scripts = options.install
      ? [
          { commands: [['pnpm', 'install', '--silent']], phase: 0 },
          { commands: [['pnpm', '--filter', ui, 'exec', 'shadcn', 'init', ...initArgs]], phase: 1 },
          {
            commands: [['pnpm', '--filter', ui, 'exec', 'shadcn', 'add', ...adds, '-y']],
            phase: 2,
          },
        ]
      : [];

    // Note: post-scaffold guidance is rendered by the generator's `bin` (a highlighted note, with an
    // acknowledge-to-continue prompt on interactive runs) rather than as plain `suggestions`, so the
    // wiring steps stand out. See bin/index.ts.
    return {
      files,
      scripts,
    };
  },
});
