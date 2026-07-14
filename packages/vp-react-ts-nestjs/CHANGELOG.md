# @pauldvlp/vp-react-ts-nestjs

## 0.3.3

### Patch Changes

- e9191d4: Set `devEngines.packageManager.onFail` to `warn` (was `download`) in the web/api templates. Under corepack, pnpm refuses to self-switch versions, so `onFail: "download"` turned a version mismatch into a hard `pnpm install` failure for anyone whose pnpm differs from the pinned `11.9.0`. `warn` only surfaces a notice and lets the install proceed, matching the root `package.json`.

## 0.3.2

### Patch Changes

- 78f993f: Remove the unsupported `lint.options` (`typeAware`/`typeCheck`) block from every subpackage `vite.config.ts`. oxlint only honors these in the root config, so they were a no-op in `apps/*` and `packages/*`. The root config of each template keeps them.

## 0.3.1

### Patch Changes

- d051fba: Refresh template and generator tooling dependencies to their latest compatible versions.

  - Tooling (generators): `@clack/prompts` `^1.7.0`, `esbuild` `^0.28.0`.
  - Template catalogs: `vite-plus` `^0.2.4`, `vitest` `4.1.10`.
  - Shared template deps: `shadcn` `^4.13.0`, `@vitejs/plugin-react` `^6.0.3`.
  - Icons: `lucide-react` `^1` (moves off the stale `^0` floor), `@hugeicons/core-free-icons` `^4.2.2`.
  - `vp-react-ts-hono`: `@hono/node-server` `^2.0.0`, `@hono/swagger-ui` `^0.6.1`.
  - `vp-react-ts-nestjs`: `pino-http` `^11` (kept compatible with `nestjs-pino`).

  Validated with `smoke:install` across all four templates.

## 0.3.0

### Minor Changes

- 8cfd18d: Wire up the built-in Vitest runner: add a `test` script (`vp test`) and gate it in `ready`. Hono ships a smoke test over the shared Zod contracts; NestJS's `ItemsService` spec is now runnable (it was missing `import 'reflect-metadata'`, without which the DI container fails to compile).

### Patch Changes

- 8cfd18d: Unify TypeScript on a single major per scaffolded repo: resolve `typescript` and `@types/node` from the workspace catalog (`^5` / `^24`) in the web/ui apps instead of hardcoding `~6.0.2`/`^24.13.2`. Previously a generated monorepo mixed TS 6 (apps) with TS 5 (api/contracts).

## 0.2.3

### Patch Changes

- 39ba087: Fix the scripts table column widths in the scaffolded project's README so a fresh `vp check` passes without reformatting.

## 0.2.2

### Patch Changes

- b7b6fd9: Ship the template skeleton's manifests as `_package.json` (restored to `package.json` on scaffold via the RENAME map) so the published tarball no longer carries parseable nested `package.json` files. Supply-chain scanners were resolving the scaffolded app's full dependency tree from those manifests and mis-attributing its alerts to the generator; the generator's only real dependency is `@clack/prompts`. Generated projects are unchanged — they still receive a real `package.json`.

## 0.2.1

### Patch Changes

- 8c355df: Harden the post-scaffold command runner and inputs (Socket findings):

  - Run post-scaffold install/init steps as argv arrays with no shell, removing the command-injection surface that `execFileSync(..., { shell: true })` exposed when interpolating user-supplied values.
  - Validate user-influenced options (scope, name, preset, component list) against an allowlist, rejecting argv-/shell-unsafe values at both the CLI flag and prompt.
  - Contain scaffolded file writes to the chosen target directory.
  - Read the generator's own name/description at runtime instead of statically importing package.json, so the manifest's repository/homepage/bugs URLs no longer land in the published bundle.

## 0.2.0

### Minor Changes

- b93a90a: Replace the Bingo scaffolding engine with an in-house CLI runtime (in `@pauldvlp/template-kit`). This drops the `bingo` and `zod` dependencies and upgrades `@clack/prompts` to v1. Boolean options now accept both forms on the CLI — e.g. `--swagger` to enable or `--no-swagger` to disable — and `--apiPort` / `--webPort` are validated as ports. The interactive `name` prompt defaults to the chosen target directory, and pressing Enter on the port prompts accepts their defaults.

  The generated NestJS skeleton now uses Zod v4 via `zod/v4-mini` (bumped to `^4.4.3`) for its shared contracts and the api's env + request-validation schemas, keeping the shared `contracts` bundle small.

## 0.1.0

### Minor Changes

- b8654c0: Add the `vp-react-ts-nestjs` generator: a Vite+ monorepo with a React web app and a NestJS api that
  conform to the same Vite+ toolchain (a single `vp check`/`vp test`/`vp run -r build` covers both).

  - **api** — NestJS on vite-plus's native Oxc transform, which emits `emitDecoratorMetadata` (so Nest's
    DI works with no transform plugin). Dev runs on `vite-node --watch` (a clean restart per change via
    `import.meta.hot`), the production build is a Vite SSR bundle (`dist/main.js`), and specs run through
    `vite-plus/test` with DI intact.
  - **contracts** — a shared `packages/contracts` of Zod schemas + inferred types; the api validates
    request bodies with a minimal `ZodValidationPipe` and the web app types its `fetch` from the same
    source of truth.
  - **wiring** — env validated with Zod at boot and exposed via a global `ConfigModule`, structured logs
    via `nestjs-pino` (pretty in dev, JSON in prod — the mode comes from the validated env), the web app
    proxies `/api` to the server (no CORS), and `vp run -r dev` starts both at once.
  - Optional `--swagger` (Swagger UI at `/docs`, OpenAPI JSON at `/docs.json`), `--serveWeb` (the api
    serves the built web app for a single deployable), and `--docker` (multi-stage Dockerfile) flags.

  This also registers the generator in the `@pauldvlp/create` manifest, so it's offered by
  `vp create @pauldvlp` — a new template, hence a minor bump for `create`.
