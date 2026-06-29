---
"@pauldvlp/vp-react-ts-shadcn": patch
"@pauldvlp/vp-pkg-shadcn": patch
"@pauldvlp/vp-react-ts-nestjs": patch
---

Harden the post-scaffold command runner and inputs (Socket findings):

- Run post-scaffold install/init steps as argv arrays with no shell, removing the command-injection surface that `execFileSync(..., { shell: true })` exposed when interpolating user-supplied values.
- Validate user-influenced options (scope, name, preset, component list) against an allowlist, rejecting argv-/shell-unsafe values at both the CLI flag and prompt.
- Contain scaffolded file writes to the chosen target directory.
- Read the generator's own name/description at runtime instead of statically importing package.json, so the manifest's repository/homepage/bugs URLs no longer land in the published bundle.
