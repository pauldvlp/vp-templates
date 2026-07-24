# @pauldvlp/create

## 0.6.1

### Patch Changes

- 63d1961: Declare `engines.node >= 22.18.0`, matching the four generators this package indexes. It ships only a `createConfig` manifest and executes no code of its own, but every template it points at requires that floor — so without it a user on an older Node installed `@pauldvlp/create` cleanly and only hit the wall one step later, on the generator. `engines` is advisory by default, so this surfaces as a warning at install time rather than a hard failure.

## 0.6.0

### Minor Changes

- 39ba087: Add the `vp-react-ts-hono` template — a Vite+ monorepo generator that scaffolds a React web app + a Hono api (conformed to the Vite+ toolchain) sharing Zod contracts. It's the lightweight, edge-friendly counterpart to `vp-react-ts-nestjs`: the api is plain TypeScript (no decorators, no transform plugin), runs on `vite-node --watch` in dev and a Vite SSR bundle in prod. Optional flags: `--openapi` (Swagger UI served from an OpenAPI doc generated from the Zod contracts via `z.toJSONSchema`), `--serveWeb` (the api serves the built web app for a single deployable) and `--docker`. Registered in the `@pauldvlp/create` org manifest so it's offered by `vp create @pauldvlp`.

## 0.5.0

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

## 0.4.1

### Patch Changes

- 5717203: Add MIT license: include a `LICENSE` file in each published package and set `"license": "MIT"` in package metadata (previously `UNLICENSED`).

## 0.4.0

Aligned to the shared `0.4.0` baseline of the `@pauldvlp` template suite (previously `0.1.2`).
Packages version independently from this point on.

### Patch Changes

- Manifest gains the new `vp-pkg-shadcn` entry (`createConfig.templates`), so `vp create @pauldvlp`
  offers it alongside `vp-react-ts-shadcn`.
