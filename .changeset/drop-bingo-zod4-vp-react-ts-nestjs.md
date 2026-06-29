---
"@pauldvlp/vp-react-ts-nestjs": minor
---

Replace the Bingo scaffolding engine with an in-house CLI runtime (in `@pauldvlp/template-kit`). This drops the `bingo` and `zod` dependencies and upgrades `@clack/prompts` to v1. Boolean options now accept both forms on the CLI — e.g. `--swagger` to enable or `--no-swagger` to disable — and `--apiPort` / `--webPort` are validated as ports. The interactive `name` prompt defaults to the chosen target directory, and pressing Enter on the port prompts accepts their defaults.

The generated NestJS skeleton now uses Zod v4 via `zod/v4-mini` (bumped to `^4.4.3`) for its shared contracts and the api's env + request-validation schemas, keeping the shared `contracts` bundle small.
