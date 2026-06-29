<p align="center">
  <img src="https://raw.githubusercontent.com/pauldvlp/vp-templates/main/assets/cover.webp" alt="@pauldvlp/vp-templates" width="100%" />
</p>

# @pauldvlp/vp-react-ts-nestjs

A [Vite+](https://viteplus.dev) **monorepo generator** that scaffolds a full-stack workspace where the
front-end and the back-end share one toolchain:

- `apps/web` — a minimal React + Vite+ app that proxies `/api` to the server (no CORS)
- `apps/api` — a NestJS api conformed to Vite+ (no Webpack, no `nest` CLI)
- `packages/contracts` — shared **Zod** schemas + inferred types, the single source of truth for both ends

The api rides Vite+'s native **Oxc** transform, which emits `emitDecoratorMetadata` from `tsconfig.json`
— so Nest's dependency injection works with **no transform plugin**. Dev runs on `vite-node --watch`,
the production build is a Vite SSR bundle (`dist/main.js`), and a single `vp check` / `vp test` /
`vp run -r build` covers the whole workspace.

Options can be passed on the `vp create` command line (anything after `--`) or answered interactively.

## Usage

Published under the [`@pauldvlp/create`](../create) manifest:

```bash
# Interactive (prompts for anything you don't pass)
vp create @pauldvlp:vp-react-ts-nestjs

# Non-interactive, fully specified
vp create @pauldvlp:vp-react-ts-nestjs -- \
  --name my-app --scope @acme --apiPort 3000 --webPort 5173
```

> **Boolean** options (`--swagger`, `--serveWeb`, `--docker`, `--install`) accept both forms: pass
> `--swagger` to enable or `--no-swagger` to disable. Omit any option to answer it at the interactive prompt.

## Options

| Option       | Type / values | Default   | Notes                                                                                          |
| ------------ | ------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `--name`     | string        | `my-app`  | Root project / package name.                                                                   |
| `--scope`    | string        | `@<name>` | npm scope for workspace packages → `@scope/web`, `@scope/api`, `@scope/contracts`. Defaults to the project name prefixed with `@` (e.g. `--name acme` → `@acme`); falls back to `@app`. |
| `--apiPort`  | string        | `3000`    | Port the NestJS api listens on (substituted into the env default + the web proxy).             |
| `--webPort`  | string        | `5173`    | Port the web dev server listens on.                                                            |
| `--swagger`  | boolean       | `false`   | Expose Swagger UI at `/docs` and the OpenAPI JSON at `/docs.json` (adds `@nestjs/swagger`).     |
| `--serveWeb` | boolean       | `false`   | Have the api serve the built web app for a single deployable (adds `@nestjs/serve-static`).     |
| `--docker`   | boolean       | `false`   | Emit a multi-stage `apps/api/Dockerfile` (+ root `.dockerignore`).                              |
| `--install`  | boolean       | `true`    | Run `pnpm install` after scaffolding. `false` = files only.                                     |

## What it scaffolds

`produce()` reads the static monorepo skeleton under `template/`, rewriting the `@app` scope, project
name and ports, then conditionally wires the optional features via marker comments:

- **`--swagger`** swaps the `// __SWAGGER_*__` markers in `apps/api/src/main.ts` for a `DocumentBuilder` +
  `SwaggerModule.setup('docs', …, { jsonDocumentUrl: 'docs.json' })`; otherwise the markers are stripped.
- **`--serveWeb`** swaps the `// __SERVEWEB_*__` markers in `apps/api/src/app.module.ts` for a
  `ServeStaticModule.forRoot` pointing at `apps/web/dist` (excluding `/api/*`); otherwise stripped.
- **`--docker`** keeps `apps/api/Dockerfile` + the root `.dockerignore`; otherwise both are dropped.

The optional Nest deps (`@nestjs/swagger`, `@nestjs/serve-static`) are added to `apps/api/package.json`
only when their flag is on, and the README's `<!-- SWAGGER/SERVEWEB/DOCKER -->` doc blocks are kept or
dropped to match. With `--install`, `pnpm install` runs as a post-scaffold step.

## Develop the generator

```bash
pnpm install
node bin/index.ts --help            # list options
node bin/index.ts --directory /tmp/demo --name demo --scope @demo --apiPort 3000 --webPort 5173
```
