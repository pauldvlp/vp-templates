# @pauldvlp/vp-react-ts-hono

## 0.1.0

### Minor Changes

- 39ba087: Add the `vp-react-ts-hono` template — a Vite+ monorepo generator that scaffolds a React web app + a Hono api (conformed to the Vite+ toolchain) sharing Zod contracts. It's the lightweight, edge-friendly counterpart to `vp-react-ts-nestjs`: the api is plain TypeScript (no decorators, no transform plugin), runs on `vite-node --watch` in dev and a Vite SSR bundle in prod. Optional flags: `--openapi` (Swagger UI served from an OpenAPI doc generated from the Zod contracts via `z.toJSONSchema`), `--serveWeb` (the api serves the built web app for a single deployable) and `--docker`. Registered in the `@pauldvlp/create` org manifest so it's offered by `vp create @pauldvlp`.
