# @pauldvlp/vp-pkg-shadcn

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
