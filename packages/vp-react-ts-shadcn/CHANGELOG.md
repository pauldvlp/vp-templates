# @pauldvlp/vp-react-ts-shadcn

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
