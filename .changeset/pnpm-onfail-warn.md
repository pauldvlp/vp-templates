---
"@pauldvlp/vp-react-ts-hono": patch
"@pauldvlp/vp-react-ts-nestjs": patch
"@pauldvlp/vp-react-ts-shadcn": patch
---

Set `devEngines.packageManager.onFail` to `warn` (was `download`) in the web/api templates. Under corepack, pnpm refuses to self-switch versions, so `onFail: "download"` turned a version mismatch into a hard `pnpm install` failure for anyone whose pnpm differs from the pinned `11.9.0`. `warn` only surfaces a notice and lets the install proceed, matching the root `package.json`.
