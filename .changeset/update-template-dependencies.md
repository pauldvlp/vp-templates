---
"@pauldvlp/vp-pkg-shadcn": patch
"@pauldvlp/vp-react-ts-hono": patch
"@pauldvlp/vp-react-ts-nestjs": patch
"@pauldvlp/vp-react-ts-shadcn": patch
---

Refresh template and generator tooling dependencies to their latest compatible versions.

- Tooling (generators): `@clack/prompts` `^1.7.0`, `esbuild` `^0.28.0`.
- Template catalogs: `vite-plus` `^0.2.4`, `vitest` `4.1.10`.
- Shared template deps: `shadcn` `^4.13.0`, `@vitejs/plugin-react` `^6.0.3`.
- Icons: `lucide-react` `^1` (moves off the stale `^0` floor), `@hugeicons/core-free-icons` `^4.2.2`.
- `vp-react-ts-hono`: `@hono/node-server` `^2.0.0`, `@hono/swagger-ui` `^0.6.1`.
- `vp-react-ts-nestjs`: `pino-http` `^11` (kept compatible with `nestjs-pino`).

Validated with `smoke:install` across all four templates.
