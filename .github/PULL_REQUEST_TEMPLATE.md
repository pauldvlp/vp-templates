## What does this change?

<!-- And why. Link the issue with "Closes #123" if there is one. -->

## Type of change

- [ ] 🐛 Bug fix
- [ ] ✨ Feature (new template, or a new option on an existing one)
- [ ] 📝 Documentation
- [ ] 🤖 CI / tooling
- [ ] 💥 Breaking change

## How was this tested?

<!--
`pnpm test` covers produce() in memory. For anything that touches what gets installed,
say which heavier gate you ran:
  - `pnpm smoke:install` — real dependency resolution against live npm
  - Verdaccio (`pnpm registry` + `pnpm publish:local`) — full `vp create` against a real registry
-->

## Checklist

- [ ] Branch is up to date with `upstream/main`
- [ ] `pnpm test` passes
- [ ] Larger changes exercised via Verdaccio or `pnpm smoke:install`
- [ ] Changeset added if a publishable package changed (`pnpm changeset`)
