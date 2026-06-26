<p align="center">
  <img src="https://raw.githubusercontent.com/pauldvlp/vp-templates/main/assets/cover.webp" alt="@pauldvlp/vp-templates" width="100%" />
</p>

# @pauldvlp/vp-react-ts-shadcn

A [Vite+](https://viteplus.dev) **monorepo generator** that scaffolds a minimal front-end workspace:

- `apps/website` — a React + Vite+ app (Tailwind v4, React Compiler)
- `packages/ui` — a shared **shadcn** design system consumed by the app

It's a [Bingo](https://create.bingo) template, so options can be passed on the `vp create` command
line (anything after `--`) and the **shadcn theme is materialized at create time** from the preset
you choose.

## Usage

Published under the [`@pauldvlp/create`](../create) manifest:

```bash
# Interactive (prompts for anything you don't pass)
vp create @pauldvlp:vp-react-ts-shadcn

# Non-interactive, fully specified
vp create @pauldvlp:vp-react-ts-shadcn -- \
  --name my-app --scope @acme --base base --preset vega --iconLibrary lucide --components button,card,dialog
```

> Only **string/enum** options parse reliably as `vp create -- --flag value`. **Boolean** options
> (`--cssVariables`, `--rtl`, `--pointer`, `--install`) are best left to the interactive prompt —
> Bingo's CLI does not accept `--no-x` / `--x=false` cleanly. Omit them and answer the prompt.

## Options

| Option          | Type / values                                              | Default        | Notes                                                                                   |
| --------------- | ---------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------- |
| `--name`        | string                                                     | `my-app`       | Root project / package name.                                                            |
| `--scope`       | string                                                     | `@<name>`      | npm scope for workspace packages → `@scope/website`, `@scope/ui`. Defaults to the project name prefixed with `@` (e.g. `--name acme` → `@acme`); falls back to `@app`. |
| `--base`        | `radix` \| `base`                                          | `radix`        | shadcn component library (radix-ui or @base-ui). Honored by `shadcn init --base`.       |
| `--preset`      | style name or code                                         | `b30557okNu`   | A style (`nova`, `vega`, `maia`, `lyra`, `mira`, `luma`, `sera`, `rhea`) **or** a code from ui.shadcn.com. **Owns** color, fonts, radius, baseColor, menu styling. |
| `--iconLibrary` | `lucide` \| `hugeicons` \| `radix` \| `tabler`             | `hugeicons`    | Icon library (persists; not part of the preset).                                        |
| `--cssVariables`| boolean                                                    | `true`         | CSS variables for theming.                                                              |
| `--rtl`         | boolean                                                    | `false`        | RTL support.                                                                             |
| `--pointer`     | boolean                                                    | `false`        | Pointer cursor on interactive elements.                                                 |
| `--components`  | comma list                                                 | `button,badge` | shadcn components to pre-install. `button` + `badge` are always included.               |
| `--install`     | boolean                                                    | `true`         | Run install + apply the shadcn theme after scaffolding. `false` = files only.           |

### What the preset controls vs. what you control

shadcn presets are **authoritative for the theme**: `--preset` sets the `style`, `baseColor`, accent
color, fonts, radius and menu styling. Generate one at <https://ui.shadcn.com> (theme editor →
copy the preset code) and pass it as `--preset <code>`. Independent of the preset you still pick
`--base` (radix-ui vs @base-ui), `--iconLibrary`, `--rtl`, `--pointer`, and `--cssVariables`.

## How it scaffolds

`produce()` emits the monorepo skeleton (workspace, Vite+/TS config, the website shell, and a UI
package with a **minimal** `globals.css` so Tailwind v4 is detectable), then runs:

```bash
pnpm install
pnpm --filter <scope>/ui exec shadcn init --base <base> --preset <preset> ... --no-reinstall -y -f
pnpm --filter <scope>/ui exec shadcn add button badge <extra> -y
```

shadcn `init` fills the theme tokens into `globals.css` and creates `lib/utils.ts`; `add` writes
components into `src/components/ui/`. The UI package `exports` (`./components/* → ./src/components/*.tsx`)
resolves them as `@scope/ui/components/ui/<name>`, which is how the starter `App.tsx` imports them.

## Re-theme later

```bash
pnpm --filter @scope/ui exec shadcn init --preset <new-code> --no-reinstall -y -f
pnpm --filter @scope/ui exec shadcn add <component>
```

## Develop the generator

```bash
pnpm install
node bin/index.ts --help            # list options
node bin/index.ts --directory /tmp/demo --name demo --scope @demo --base base --preset vega
```
