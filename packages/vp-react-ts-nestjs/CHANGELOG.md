# @pauldvlp/vp-react-ts-nestjs

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
