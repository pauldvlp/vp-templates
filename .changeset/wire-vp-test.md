---
"@pauldvlp/vp-react-ts-hono": minor
"@pauldvlp/vp-react-ts-nestjs": minor
---

Wire up the built-in Vitest runner: add a `test` script (`vp test`) and gate it in `ready`. Hono ships a smoke test over the shared Zod contracts; NestJS's `ItemsService` spec is now runnable (it was missing `import 'reflect-metadata'`, without which the DI container fails to compile).
