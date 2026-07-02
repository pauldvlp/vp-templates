# @pauldvlp/vp-pkg-shadcn

## 0.5.3

### Patch Changes

- 8cfd18d: Unify TypeScript on a single major per scaffolded repo: resolve `typescript` and `@types/node` from the workspace catalog (`^5` / `^24`) in the web/ui apps instead of hardcoding `~6.0.2`/`^24.13.2`. Previously a generated monorepo mixed TS 6 (apps) with TS 5 (api/contracts).

## 0.5.2

### Patch Changes

- b7b6fd9: Ship the template skeleton's manifests as `_package.json` (restored to `package.json` on scaffold via the RENAME map) so the published tarball no longer carries parseable nested `package.json` files. Supply-chain scanners were resolving the scaffolded app's full dependency tree from those manifests and mis-attributing its alerts to the generator; the generator's only real dependency is `@clack/prompts`. Generated projects are unchanged — they still receive a real `package.json`.

## 0.5.1

### Patch Changes

- 8c355df: Harden the post-scaffold command runner and inputs (Socket findings):

  - Run post-scaffold install/init steps as argv arrays with no shell, removing the command-injection surface that `execFileSync(..., { shell: true })` exposed when interpolating user-supplied values.
  - Validate user-influenced options (scope, name, preset, component list) against an allowlist, rejecting argv-/shell-unsafe values at both the CLI flag and prompt.
  - Contain scaffolded file writes to the chosen target directory.
  - Read the generator's own name/description at runtime instead of statically importing package.json, so the manifest's repository/homepage/bugs URLs no longer land in the published bundle.

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
