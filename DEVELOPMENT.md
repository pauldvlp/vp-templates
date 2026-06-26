# Development

How to work on the templates, test them with `vp` locally, and release new versions.

## Setup

```bash
pnpm install
```

Requirements: Node `>=22.18.0`, pnpm `11.9.0`, and the `vp` (Vite+) CLI installed globally.

## Two ways to test

### 1. Fast inner loop — `pnpm smoke` (no registry, no install)

Runs each generator's `produce()` and asserts the emitted file tree, scope/name substitution, and
per-option wiring. Use this constantly while editing a generator:

```bash
pnpm --filter @pauldvlp/vp-react-ts-shadcn build   # rebuild dist after editing src/
pnpm smoke
```

You can also drive a generator's CLI directly into a throwaway dir (this still runs install + shadcn):

```bash
node packages/vp-react-ts-shadcn/dist/index.js \
  --directory /tmp/demo --name demo --scope @demo --base base --preset vega
```

### 1b. Real-install smoke — `pnpm smoke:install` (catches broken dep bumps)

`pnpm smoke` only asserts the in-memory file tree; it never installs, so a bad version in
`template/**/package.json`, the template's `catalog:`, or `src/template.ts`'s `ICON_LIBS` map slips
through. `pnpm smoke:install` scaffolds to disk and runs the generator's post-scaffold `pnpm install`
against the real npm registry — the generated project has no lockfile and uses version *ranges*, so a
fresh install pulls the newest matching release and fails if it's incompatible. Run it on a schedule
to notice when a dependency ships a breaking version inside an allowed range.

```bash
pnpm smoke:install         # scaffold + `pnpm install` (dependency-resolution gate)
pnpm smoke:install --full  # also run shadcn init/add + `pnpm run build` (typecheck + bundle)
```

### 2. Full `vp create` against a local registry (Verdaccio)

This reproduces the real published experience — `vp create @pauldvlp:...` resolving the manifest and
generator from a registry — without touching npm.

```bash
# terminal A: start the local registry (http://localhost:4873)
pnpm registry

# terminal B: build + publish every package to the local registry (anonymous, no login)
pnpm publish:local

# then scaffold from it: point the @pauldvlp scope at the local registry and run vp create
mkdir -p /tmp/try && cd /tmp/try
echo '@pauldvlp:registry=http://localhost:4873' > .npmrc
vp create @pauldvlp                       # interactive picker
vp create @pauldvlp:vp-react-ts-shadcn    # a specific template
```

`vp create` reads `.npmrc` and honors the `@pauldvlp:registry=` scope mapping, so only `@pauldvlp/*`
come from Verdaccio; React, shadcn, fonts, etc. still come from the real npm registry.

> Re-publishing the same version to Verdaccio is rejected, just like npm. While iterating, either wipe
> local storage (`rm -rf .verdaccio/storage`) or bump the version (see below) before `pnpm publish:local`.

## Versioning & changelogs (Changesets)

Versions and `CHANGELOG.md`s are managed with [changesets](https://github.com/changesets/changesets).
Each publishable package versions independently; the root is private and ignored.

```bash
# 1. After making changes, record them (pick packages + bump type + write a summary)
pnpm changeset

# 2. Apply pending changesets: bump versions and write CHANGELOGs
pnpm version

# 3. Publish what changed to npm (builds first via each package's prepack)
pnpm release
```

A typical loop: edit → `pnpm changeset` → commit → when ready, `pnpm version` → commit → `pnpm release`.

> **npm version reuse:** npm does not let you (re)publish a version that was ever published or
> unpublished. If `pnpm release` 403s on a burned version, run `pnpm changeset` + `pnpm version` again
> to move to the next number.

## Adding a new template

1. `mkdir packages/<gen>` — a Bingo generator (copy `vp-react-ts-shadcn`'s shape: `bin/`, `src/template.ts`,
   `template/`, a `build` script bundling to `dist/index.js`, and `bingo` as a dependency).
2. Add an entry to `packages/create/package.json` → `createConfig.templates`:
   `{ "name": "vp-<x>", "description": "...", "template": "@pauldvlp/vp-<x>", "monorepo": true | omit }`
   — `monorepo: true` for new-project scaffolds; omit for "add into an existing repo" generators.
3. Add a smoke case in `scripts/smoke.mjs`.
4. `pnpm changeset` (new package = `minor`/`major`), then publish both the generator and the bumped
   `@pauldvlp/create`.

See the [root README](./README.md) for the naming convention.

## Publishing checklist

- [ ] `pnpm smoke` passes
- [ ] Tested via Verdaccio (`pnpm registry` + `pnpm publish:local` + `vp create @pauldvlp:...`)
- [ ] `pnpm changeset` recorded; `pnpm version` applied; CHANGELOGs reviewed
- [ ] `pnpm release` (publishes to npm with `--access public`)
- [ ] If `@pauldvlp/create`'s manifest changed, it was bumped and republished too
