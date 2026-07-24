---
'@pauldvlp/vp-react-ts-hono': patch
'@pauldvlp/vp-react-ts-nestjs': patch
'@pauldvlp/vp-react-ts-shadcn': patch
---

Bump the pnpm pin shipped in the generated project's `devEngines.packageManager` from `11.9.0` to `11.17.0`. This is config for the project a user scaffolds, not this repo's own toolchain, and it had been left behind while the root pin moved twice. `onFail` stays `warn`, so a contributor whose pnpm differs still gets a notice rather than a failed install.
