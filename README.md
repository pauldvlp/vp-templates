<p align="center">
  <img src="./assets/cover.webp" alt="@pauldvlp/vp-templates" width="100%" />
</p>

# @pauldvlp/vp-templates

Monorepo of [Vite+](https://viteplus.dev) templates and generators published by `@pauldvlp`, all in
one repo. The index package `@pauldvlp/create` exposes them through `vp create`.

```bash
vp create @pauldvlp                     # interactive picker over every template
vp create @pauldvlp:vp-react-ts-shadcn  # scaffold a specific template (new project)
cd existing-monorepo
vp create @pauldvlp:vp-pkg-shadcn       # add a single package (packages/ui) into an existing repo
```

> **Why `@pauldvlp:` and not `@pauldvlp/vp:`** — Vite+'s `vp create` only treats a **bare scope**
> as an org manifest. Its parser bails on any spec containing `/` (`parseOrgScopedSpec`:
> `if (spec.includes("/")) return null`), so `@pauldvlp/vp:...` can't resolve. The `vp` flavor
> lives in the **entry name** instead (`vp-react-ts-shadcn`), giving `vp create @pauldvlp:vp-...`.

## Layout

```
packages/
├── create/                 → @pauldvlp/create              the org manifest (createConfig.templates)
├── template-kit/           → @pauldvlp/template-kit        private shared helpers + CLI runtime (bundled into each generator)
├── vp-react-ts-shadcn/     → @pauldvlp/vp-react-ts-shadcn  generator: website app + shadcn ui
├── vp-react-ts-nestjs/     → @pauldvlp/vp-react-ts-nestjs  generator: React web app + NestJS api + Zod contracts
├── vp-react-ts-hono/       → @pauldvlp/vp-react-ts-hono    generator: React web app + Hono api + Zod contracts
└── vp-pkg-shadcn/          → @pauldvlp/vp-pkg-shadcn       generator: add packages/ui into an existing repo
```

## Naming convention (how it grows)

| Kind                              | Package name            | Manifest entry          | `monorepo` |
| --------------------------------- | ----------------------- | ----------------------- | ---------- |
| Full project / monorepo scaffold  | `@pauldvlp/vp-<stack>`  | `vp-<stack>`            | `true`     |
| Single package into existing repo | `@pauldvlp/vp-pkg-<x>`  | `vp-pkg-<x>` (or alias) | omit       |
| Pack of packages at once          | `@pauldvlp/vp-pack-<x>` | `vp-pack-<x>`           | omit       |

- `monorepo: true` hides the entry when `vp create` runs inside an existing monorepo (new-project
  scaffolds only). Omitting it keeps the entry available inside existing repos — for "add a package"
  and "add a pack" generators.
- **Adding a template** = create `packages/<pkg>/` (a generator), then add one entry to
  `packages/create/package.json` → `createConfig.templates`.

## Develop, test & release

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for the full workflow. In short:

```bash
pnpm install
pnpm test                       # fast: validate generator output (no registry/install)

# test the real `vp create` flow locally against a Verdaccio registry:
pnpm registry                   # terminal A — local registry on :4873
pnpm publish:local              # terminal B — build + publish all packages there
#   then, in a scratch dir with `@pauldvlp:registry=http://localhost:4873` in .npmrc:
#   vp create @pauldvlp:vp-react-ts-shadcn

# release: versions & changelogs are managed with Changesets
pnpm changeset                  # record what changed
pnpm version                    # bump versions + write CHANGELOGs
pnpm release                    # build + publish changed packages to npm
```

Each `@pauldvlp/*` package versions and publishes independently; the root is private. `@pauldvlp/create`
only needs republishing when the manifest changes.
