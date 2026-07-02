# @pauldvlp/vp-react-ts-shadcn

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

- b93a90a: Replace the Bingo scaffolding engine with an in-house CLI runtime (in `@pauldvlp/template-kit`). This drops the `bingo` and `zod` dependencies and upgrades `@clack/prompts` to v1. Boolean options now accept both forms on the CLI — e.g. `--rtl` to enable or `--no-rtl` to disable — and the generator owns its prompts, file-writing and post-scaffold steps directly. The interactive `name` prompt now defaults to the chosen target directory. Scaffold output is unchanged.

## 0.4.1

### Patch Changes

- 5717203: Add MIT license: include a `LICENSE` file in each published package and set `"license": "MIT"` in package metadata (previously `UNLICENSED`).

## 0.4.0

Aligned to the shared `0.4.0` baseline of the `@pauldvlp` template suite (previously `0.3.2`).
Packages version independently from this point on.

### Patch Changes

- Fix `--base` / `--iconLibrary` on the Bingo CLI: they're now unions of string literals instead of
  `z.enum(...)`, which Bingo's arg parser couldn't read (a bare `--base radix` mis-parsed to
  `base: true`, producing an invalid `components.json` like `"style": "true-nova"` and failing
  `shadcn add`). They still render as an interactive `select`.
- Internally, the shadcn/file-tree logic shared between the generators is now factored into the
  private `@pauldvlp/template-kit` package (bundled into each generator's `dist`, never published).
  Output is unchanged.
