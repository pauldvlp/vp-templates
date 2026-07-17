<p align="center">
  <img src="https://raw.githubusercontent.com/pauldvlp/vp-templates/main/assets/cover.webp" alt="@pauldvlp/vp-templates" width="100%" />
</p>

# @pauldvlp/vp-react-ts-hono

A [Vite+](https://viteplus.dev) **monorepo generator** that scaffolds a full-stack workspace where the
front-end and the back-end share one toolchain:

- `apps/web` — a minimal React + Vite+ app that proxies `/api` to the server (no CORS)
- `apps/api` — a [Hono](https://hono.dev) api conformed to Vite+ (plain TypeScript, no transform plugin)
- `packages/contracts` — shared **Zod** schemas + inferred types, the single source of truth for both ends

Hono is plain TypeScript — no decorators, no metadata — so the api is a plain Vite+ package with zero
wiring. Dev runs on `vite-node --watch`, the production build is a Vite SSR bundle (`dist/main.js`), and
a single `vp check` / `vp test` / `vp run -r build` covers the whole workspace. It's the lightweight,
edge-friendly counterpart to [`vp-react-ts-nestjs`](../vp-react-ts-nestjs).

Options can be passed on the `vp create` command line (anything after `--`) or answered interactively.

## Usage

Published under the [`@pauldvlp/create`](../create) manifest:

```bash
# Interactive (prompts for anything you don't pass)
vp create @pauldvlp:vp-react-ts-hono

# Non-interactive, fully specified
vp create @pauldvlp:vp-react-ts-hono -- \
  --name my-app --scope @acme --apiPort 3000 --webPort 5173
```

> **Boolean** options (`--openapi`, `--serveWeb`, `--docker`, `--install`) accept both forms: pass
> `--openapi` to enable or `--no-openapi` to disable. Omit any option to answer it at the interactive prompt.

## Options

| Option       | Type / values | Default   | Notes                                                                                                                                                                                   |
| ------------ | ------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--name`     | string        | `my-app`  | Root project / package name.                                                                                                                                                            |
| `--scope`    | string        | `@<name>` | npm scope for workspace packages → `@scope/web`, `@scope/api`, `@scope/contracts`. Defaults to the project name prefixed with `@` (e.g. `--name acme` → `@acme`); falls back to `@app`. |
| `--apiPort`  | string        | `3000`    | Port the Hono api listens on (substituted into the env default + the web proxy).                                                                                                        |
| `--webPort`  | string        | `5173`    | Port the web dev server listens on.                                                                                                                                                     |
| `--openapi`  | boolean       | `false`   | Expose Swagger UI at `/docs` and the OpenAPI JSON at `/docs.json`, generated from the Zod contracts (adds `@hono/swagger-ui`).                                                          |
| `--serveWeb` | boolean       | `false`   | Have the api serve the built web app for a single deployable (uses `@hono/node-server`'s `serveStatic`).                                                                                |
| `--docker`   | boolean       | `false`   | Emit a multi-stage `apps/api/Dockerfile` (+ root `.dockerignore`).                                                                                                                      |
| `--install`  | boolean       | `true`    | Run `pnpm install` after scaffolding. `false` = files only.                                                                                                                             |

## What it scaffolds

`produce()` reads the static monorepo skeleton under `template/`, rewriting the `@app` scope, project
name and ports, then conditionally wires the optional features via marker comments:

- **`--openapi`** swaps the `// __OPENAPI_*__` markers in `apps/api/src/app.ts` for the `swaggerUI` +
  `/docs.json` routes and keeps `apps/api/src/openapi.ts` (the doc built from the contracts with
  `z.toJSONSchema`); otherwise the markers are stripped and `openapi.ts` is dropped.
- **`--serveWeb`** swaps the `// __SERVEWEB_*__` markers in `apps/api/src/app.ts` for a `serveStatic`
  mount of `apps/web/dist` (registered after the `/api` routes); otherwise they're stripped.
- **`--docker`** keeps `apps/api/Dockerfile` + the root `.dockerignore`; otherwise both are dropped.

The optional Swagger UI dep (`@hono/swagger-ui`) is added to `apps/api/package.json` only when
`--openapi` is on, and the README's `<!-- OPENAPI/SERVEWEB/DOCKER -->` doc blocks are kept or dropped to
match. With `--install`, `pnpm install` runs as a post-scaffold step.

## Develop the generator

```bash
pnpm install
node bin/index.ts --help            # list options
node bin/index.ts --directory /tmp/demo --name demo --scope @demo --apiPort 3000 --webPort 5173
```
