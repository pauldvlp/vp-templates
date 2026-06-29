---
"@pauldvlp/vp-react-ts-shadcn": minor
---

Replace the Bingo scaffolding engine with an in-house CLI runtime (in `@pauldvlp/template-kit`). This drops the `bingo` and `zod` dependencies and upgrades `@clack/prompts` to v1. Boolean options now accept both forms on the CLI — e.g. `--rtl` to enable or `--no-rtl` to disable — and the generator owns its prompts, file-writing and post-scaffold steps directly. The interactive `name` prompt now defaults to the chosen target directory. Scaffold output is unchanged.
