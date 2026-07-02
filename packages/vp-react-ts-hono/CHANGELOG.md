# @pauldvlp/vp-react-ts-hono

## 0.2.0

### Minor Changes

- 8cfd18d: Wire up the built-in Vitest runner: add a `test` script (`vp test`) and gate it in `ready`. Hono ships a smoke test over the shared Zod contracts; NestJS's `ItemsService` spec is now runnable (it was missing `import 'reflect-metadata'`, without which the DI container fails to compile).

### Patch Changes

- 8cfd18d: Unify TypeScript on a single major per scaffolded repo: resolve `typescript` and `@types/node` from the workspace catalog (`^5` / `^24`) in the web/ui apps instead of hardcoding `~6.0.2`/`^24.13.2`. Previously a generated monorepo mixed TS 6 (apps) with TS 5 (api/contracts).

## 0.1.0

### Minor Changes

- 39ba087: Add the `vp-react-ts-hono` template — a Vite+ monorepo generator that scaffolds a React web app + a Hono api (conformed to the Vite+ toolchain) sharing Zod contracts. It's the lightweight, edge-friendly counterpart to `vp-react-ts-nestjs`: the api is plain TypeScript (no decorators, no transform plugin), runs on `vite-node --watch` in dev and a Vite SSR bundle in prod. Optional flags: `--openapi` (Swagger UI served from an OpenAPI doc generated from the Zod contracts via `z.toJSONSchema`), `--serveWeb` (the api serves the built web app for a single deployable) and `--docker`. Registered in the `@pauldvlp/create` org manifest so it's offered by `vp create @pauldvlp`.
