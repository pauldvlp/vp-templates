<p align="center">
  <img src="https://raw.githubusercontent.com/pauldvlp/vp-templates/main/assets/cover.webp" alt="@pauldvlp/vp-templates" width="100%" />
</p>

# @pauldvlp/vp-pkg-shadcn

A [Vite+](https://viteplus.dev) **package generator** that drops a shared, fully customizable
**shadcn** UI package into an **existing** monorepo:

- `packages/ui` — a shared shadcn design system (Tailwind v4, fonts, `lib/utils`, `components/ui/*`)

It's a [Bingo](https://create.bingo) template, so options can be passed on the `vp create` command
line (anything after `--`) and the **shadcn theme is materialized at create time** from the preset
you choose. Unlike [`@pauldvlp/vp-react-ts-shadcn`](../vp-react-ts-shadcn) (which scaffolds a whole
monorepo), this only emits `packages/ui` and leaves the rest of your repo untouched.

## Usage

Run it from the root of an existing repo (published under the [`@pauldvlp/create`](../create) manifest):

```bash
# Interactive (prompts for anything you don't pass)
vp create @pauldvlp:vp-pkg-shadcn

# Non-interactive, fully specified
vp create @pauldvlp:vp-pkg-shadcn -- \
  --scope @acme --base base --preset vega --iconLibrary lucide --components button,card,dialog
```

> Only **string/enum** options parse reliably as `vp create -- --flag value`. **Boolean** options
> (`--cssVariables`, `--rtl`, `--pointer`, `--install`) are best left to the interactive prompt —
> Bingo's CLI does not accept `--no-x` / `--x=false` cleanly. Omit them and answer the prompt.

### Requirements

Your repo must be a **pnpm workspace that globs the directory you pick** (e.g. `packages/*`), so the
new `<scope>/ui` is linked and the post-scaffold `pnpm --filter <scope>/ui ...` steps resolve. The
generator does **not** edit your `pnpm-workspace.yaml` or any app — wiring a consumer is up to you
(see below).

### Where it lands (the `--directory`)

The generator emits the package contents at the **root** of its file tree, and Bingo writes them under
the target directory — which **defaults to `ui`** (so within `vp create`'s monorepo flow it lands at
`<chosen-parent>/ui`, e.g. `packages/ui`). Pass `--directory <path>` to place it elsewhere. `--scope`
defaults to the **surrounding monorepo's scope** (read from the nearest `pnpm-workspace.yaml`'s
`package.json` — e.g. a repo named `acme` → `@acme`), falling back to `@app` outside a workspace.

## Options

| Option          | Type / values                                  | Default        | Notes                                                                                   |
| --------------- | ---------------------------------------------- | -------------- | --------------------------------------------------------------------------------------- |
| `--scope`       | string                                         | monorepo scope | npm scope for the package → `@scope/ui`. Defaults to the surrounding monorepo's scope (e.g. `@acme`), `@app` outside a workspace. `@` is added if you omit it. |
| `--base`        | `radix` \| `base`                              | `radix`        | shadcn component library (radix-ui or @base-ui). Honored by `shadcn init --base`.       |
| `--preset`      | style name or code                             | `b30557okNu`   | A style (`nova`, `vega`, `maia`, `lyra`, `mira`, `luma`, `sera`, `rhea`) **or** a code from ui.shadcn.com. **Owns** color, fonts, radius, baseColor, menu styling. |
| `--iconLibrary` | `lucide` \| `hugeicons` \| `radix` \| `tabler` | `hugeicons`    | Icon library (persists; not part of the preset).                                        |
| `--cssVariables`| boolean                                        | `true`         | CSS variables for theming.                                                              |
| `--rtl`         | boolean                                        | `false`        | RTL support.                                                                             |
| `--pointer`     | boolean                                        | `false`        | Pointer cursor on interactive elements.                                                 |
| `--components`  | comma list                                     | `button,badge` | shadcn components to pre-install. `button` + `badge` are always included.               |
| `--install`     | boolean                                        | `true`         | Run install + apply the shadcn theme after scaffolding. `false` = files only.           |

## How it scaffolds

`produce()` emits `packages/ui` with a **minimal** `globals.css` (so Tailwind v4 is detectable),
resolves the package's `catalog:` specifiers to concrete versions (it can't assume your repo's
pnpm catalog), bakes `components.json` from your options, then runs:

```bash
pnpm install
pnpm --filter <scope>/ui exec shadcn init --base <base> --preset <preset> ... --no-reinstall -y -f
pnpm --filter <scope>/ui exec shadcn add button badge <extra> -y
```

shadcn `init` fills the theme tokens into `globals.css` and creates `lib/utils.ts`; `add` writes
components into `src/components/ui/`. The UI package `exports` (`./components/* → ./src/components/*.tsx`)
resolves them as `@scope/ui/components/ui/<name>`.

## Consume it from an app

This generator only creates the `ui` package — wiring it into a consuming app is three steps:

**1. Depend on it.**

```jsonc
// apps/<your-app>/package.json
"dependencies": { "@scope/ui": "workspace:*" }
```

**2. Give the app Tailwind v4.** The app — not the `ui` package — compiles the styles, so it needs the
Tailwind plugin. Skip this if the app already uses Tailwind v4.

```bash
pnpm --filter <your-app> add -D @tailwindcss/vite tailwindcss
```

```ts
// apps/<your-app>/vite.config.ts
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({ plugins: [/* ...existing */ tailwindcss()] })
```

> `ui`'s `globals.css` already `@source`s `apps/**/*.{ts,tsx}` (and the `ui` package), so Tailwind
> scans your app's class names. If your app lives outside `apps/`, add an `@source` for its path.

**3. Import the styles once at the app's entry point**, then use components:

```tsx
// apps/<your-app>/src/main.tsx
import '@scope/ui/globals.css'
import { Button } from '@scope/ui/components/ui/button'
```

## Re-theme later

```bash
pnpm --filter @scope/ui exec shadcn init --preset <new-code> --no-reinstall -y -f
pnpm --filter @scope/ui exec shadcn add <component>
```

## Develop the generator

```bash
pnpm install
node bin/index.ts --help            # list options
node bin/index.ts --directory /tmp/demo --scope @demo --base base --preset vega
```
