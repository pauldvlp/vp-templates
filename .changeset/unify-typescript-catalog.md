---
"@pauldvlp/vp-react-ts-hono": patch
"@pauldvlp/vp-react-ts-nestjs": patch
"@pauldvlp/vp-react-ts-shadcn": patch
"@pauldvlp/vp-pkg-shadcn": patch
---

Unify TypeScript on a single major per scaffolded repo: resolve `typescript` and `@types/node` from the workspace catalog (`^5` / `^24`) in the web/ui apps instead of hardcoding `~6.0.2`/`^24.13.2`. Previously a generated monorepo mixed TS 6 (apps) with TS 5 (api/contracts).
