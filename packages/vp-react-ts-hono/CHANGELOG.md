# @pauldvlp/vp-react-ts-hono

## 0.2.3

### Patch Changes

- e9191d4: Set `devEngines.packageManager.onFail` to `warn` (was `download`) in the web/api templates. Under corepack, pnpm refuses to self-switch versions, so `onFail: "download"` turned a version mismatch into a hard `pnpm install` failure for anyone whose pnpm differs from the pinned `11.9.0`. `warn` only surfaces a notice and lets the install proceed, matching the root `package.json`.

## 0.2.2

### Patch Changes

- 78f993f: Remove the unsupported `lint.options` (`typeAware`/`typeCheck`) block from every subpackage `vite.config.ts`. oxlint only honors these in the root config, so they were a no-op in `apps/*` and `packages/*`. The root config of each template keeps them.

## 0.2.1

### Patch Changes

- d051fba: Refresh template and generator tooling dependencies to their latest compatible versions.

  - Tooling (generators): `@clack/prompts` `^1.7.0`, `esbuild` `^0.28.0`.
  - Template catalogs: `vite-plus` `^0.2.4`, `vitest` `4.1.10`.
  - Shared template deps: `shadcn` `^4.13.0`, `@vitejs/plugin-react` `^6.0.3`.
  - Icons: `lucide-react` `^1` (moves off the stale `^0` floor), `@hugeicons/core-free-icons` `^4.2.2`.
  - `vp-react-ts-hono`: `@hono/node-server` `^2.0.0`, `@hono/swagger-ui` `^0.6.1`.
  - `vp-react-ts-nestjs`: `pino-http` `^11` (kept compatible with `nestjs-pino`).

  Validated with `smoke:install` across all four templates.

## 0.2.0

### Minor Changes

- 8cfd18d: Wire up the built-in Vitest runner: add a `test` script (`vp test`) and gate it in `ready`. Hono ships a smoke test over the shared Zod contracts; NestJS's `ItemsService` spec is now runnable (it was missing `import 'reflect-metadata'`, without which the DI container fails to compile).

### Patch Changes

- 8cfd18d: Unify TypeScript on a single major per scaffolded repo: resolve `typescript` and `@types/node` from the workspace catalog (`^5` / `^24`) in the web/ui apps instead of hardcoding `~6.0.2`/`^24.13.2`. Previously a generated monorepo mixed TS 6 (apps) with TS 5 (api/contracts).

## 0.1.0

### Minor Changes

- 39ba087: Add the `vp-react-ts-hono` template — a Vite+ monorepo generator that scaffolds a React web app + a Hono api (conformed to the Vite+ toolchain) sharing Zod contracts. It's the lightweight, edge-friendly counterpart to `vp-react-ts-nestjs`: the api is plain TypeScript (no decorators, no transform plugin), runs on `vite-node --watch` in dev and a Vite SSR bundle in prod. Optional flags: `--openapi` (Swagger UI served from an OpenAPI doc generated from the Zod contracts via `z.toJSONSchema`), `--serveWeb` (the api serves the built web app for a single deployable) and `--docker`. Registered in the `@pauldvlp/create` org manifest so it's offered by `vp create @pauldvlp`.
