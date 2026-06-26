# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets). It records intended
version bumps and changelog entries for each publishable package.

- Record a change: `pnpm changeset` (pick the affected package(s) and bump type, write a summary).
- Apply pending changesets (bump versions + update CHANGELOGs): `pnpm version`.
- Publish what changed: `pnpm release`.

The root `@pauldvlp/vp-templates` package is private and ignored; only `@pauldvlp/*` publishable
packages are versioned here.
