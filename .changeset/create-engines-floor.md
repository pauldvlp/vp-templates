---
'@pauldvlp/create': patch
---

Declare `engines.node >= 22.18.0`, matching the four generators this package indexes. It ships only a `createConfig` manifest and executes no code of its own, but every template it points at requires that floor — so without it a user on an older Node installed `@pauldvlp/create` cleanly and only hit the wall one step later, on the generator. `engines` is advisory by default, so this surfaces as a warning at install time rather than a hard failure.
