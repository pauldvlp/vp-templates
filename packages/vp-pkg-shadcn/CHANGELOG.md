# @pauldvlp/vp-pkg-shadcn

## 0.5.0

### Minor Changes

- b93a90a: Replace the Bingo scaffolding engine with an in-house CLI runtime (in `@pauldvlp/template-kit`). This drops the `bingo` and `zod` dependencies and upgrades `@clack/prompts` to v1. Boolean options now accept both forms on the CLI — e.g. `--rtl` to enable or `--no-rtl` to disable — and the generator owns its prompts, file-writing and post-scaffold steps directly. Scaffold output is unchanged.

## 0.4.1

### Patch Changes

- 5717203: Add MIT license: include a `LICENSE` file in each published package and set `"license": "MIT"` in package metadata (previously `UNLICENSED`).

## 0.4.0

First release. All `@pauldvlp` template packages were aligned to a shared `0.4.0` baseline here; they
version independently from this point on.

### Minor Changes

- Add `@pauldvlp/vp-pkg-shadcn`: a generator that drops a shared, fully customizable shadcn UI package
  into an existing Vite+ monorepo. It emits the package contents at the root of the tree so Bingo
  places them directly under the chosen `--directory` (defaults to `ui`, e.g. landing at
  `packages/ui`) — no `packages/ui/packages/ui` double-nesting — defaults `--scope` to the
  surrounding monorepo's scope (e.g. `@acme`), resolves the package's `catalog:` specifiers to
  concrete versions so it works without the target repo's pnpm catalog, applies the shadcn theme via
  the chosen preset, and removes the nested `.git` repo Bingo would otherwise initialize.
- Post-scaffold consumer wiring (depend on the package, give the app Tailwind v4 via
  `@tailwindcss/vite` + plugin, `import '<scope>/ui/globals.css'` at the app entry, add components,
  docs link) is rendered as a highlighted, colored note; interactive runs add an
  acknowledge-to-continue prompt so it isn't buried under the host's prompts.
