# Contributing

Thanks for taking the time to contribute! 🎉 This guide explains how to set up the project, how to
propose a change, and how to test templates with `vp` locally before opening a pull request.

Whether you're fixing a typo, improving a template, or adding a brand new generator, you're welcome
here. If anything below is unclear, [open an issue](https://github.com/pauldvlp/vp-templates/issues)
and ask — improving these docs is a valid contribution too.

## Quick start

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/vp-templates.git
cd vp-templates

# 2. Add the original repo as "upstream" so you can stay in sync
git remote add upstream https://github.com/pauldvlp/vp-templates.git

# 3. Install dependencies
pnpm install
```

Requirements: Node `>=22.18.0`, pnpm `11.9.0`, and the `vp` (Vite+) CLI installed globally.

## How to contribute a change

1. **Find or open an issue.** For anything beyond a trivial fix, open an issue (or comment on an
   existing one) so we can agree on the approach before you invest time.
2. **Create a branch** off an up-to-date `main`:
   ```bash
   git checkout main
   git pull upstream main
   git checkout -b fix/short-description   # or feat/…, docs/…, chore/…
   ```
3. **Make your change** and keep it focused — one logical change per PR is easiest to review.
4. **Test it** with the smoke tests (and Verdaccio for bigger changes) — see [Testing](#testing).
5. **Record a changeset** if you touched a publishable package — see [Changesets](#versioning--changelogs-changesets).
6. **Commit and push** to your fork, then open a PR — see [Opening a pull request](#opening-a-pull-request).

## Opening a pull request

- Push your branch to your fork and open a PR against `pauldvlp/vp-templates` `main`.
- **Title:** use a short, imperative summary (e.g. `feat: add vp-pkg-vue generator`). We loosely
  follow [Conventional Commits](https://www.conventionalcommits.org/) prefixes (`feat`, `fix`,
  `docs`, `chore`, `refactor`, `ci`).
- **Description:** explain *what* changed and *why*. Link the related issue with `Closes #123`.
- **Keep PRs small and focused.** Unrelated changes are easier as separate PRs.
- **Run the checks** in the [PR checklist](#pull-request-checklist) before requesting review.
- A maintainer will review your PR. Don't worry about bumping versions or publishing — that's handled
  on merge by a maintainer.

## Testing

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

**If your PR changes a publishable package, add a changeset** — this is the one versioning step
contributors need to do. It tells us which packages changed and how:

```bash
pnpm changeset   # pick the affected packages + bump type, then write a short summary
```

Commit the generated file in `.changeset/` along with your change. That's it — applying the bump and
publishing is a maintainer step (documented below for reference).

<details>
<summary>Maintainer release flow</summary>

```bash
# Apply pending changesets: bump versions and write CHANGELOGs
pnpm version

# Publish what changed to npm (builds first via each package's prepack)
pnpm release
```

A typical loop: edit → `pnpm changeset` → commit → when ready, `pnpm version` → commit → `pnpm release`.

> **npm version reuse:** npm does not let you (re)publish a version that was ever published or
> unpublished. If `pnpm release` 403s on a burned version, run `pnpm changeset` + `pnpm version` again
> to move to the next number.

</details>

## Adding a new template

1. `mkdir packages/<gen>` — a Bingo generator (copy `vp-react-ts-shadcn`'s shape: `bin/`, `src/template.ts`,
   `template/`, a `build` script bundling to `dist/index.js`, and `bingo` as a dependency).
2. Add an entry to `packages/create/package.json` → `createConfig.templates`:
   `{ "name": "vp-<x>", "description": "...", "template": "@pauldvlp/vp-<x>", "monorepo": true | omit }`
   — `monorepo: true` for new-project scaffolds; omit for "add into an existing repo" generators.
3. Add a smoke case in `scripts/smoke.mjs`.
4. `pnpm changeset` (new package = `minor`/`major`).

See the [root README](./README.md) for the naming convention.

### Shared logic — `@pauldvlp/template-kit`

Logic common to the generators (file-tree building, shadcn `components.json`, `ICON_LIBS`, the
`catalog:` resolver, shadcn `init` flags) lives in the **private** `@pauldvlp/template-kit` package.
It is never published — each generator inlines it into its own `dist`. The mechanism: add it as a
`workspace:*` devDependency (so `node bin/index.ts` and `pnpm smoke` resolve it), and add a
`tsconfig.json` `paths` entry pointing at its **source**:

```jsonc
"baseUrl": ".",
"paths": { "@pauldvlp/template-kit": ["../template-kit/src/index.ts"] }
```

esbuild reads that `paths` entry and bundles the kit inline — tsconfig `paths` matches are exempt
from `--packages=external`, so the published bundle is self-contained with no bare `@pauldvlp/template-kit`
import. Adding a `catalog:`-resolving "into an existing repo" generator? Reuse `resolveCatalogDeps`
and keep `CATALOG` in `template-kit/src/index.ts` in sync with the template `pnpm-workspace.yaml`.

## Pull request checklist

- [ ] Branch is up to date with `upstream/main`
- [ ] `pnpm smoke` passes
- [ ] Bigger changes tested via Verdaccio (`pnpm registry` + `pnpm publish:local` + `vp create @pauldvlp:...`)
- [ ] A changeset was added (`pnpm changeset`) if a publishable package changed
- [ ] PR description explains the change and links any related issue (`Closes #…`)
