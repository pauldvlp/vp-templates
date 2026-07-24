---
'@pauldvlp/vp-react-ts-hono': patch
'@pauldvlp/vp-react-ts-nestjs': patch
'@pauldvlp/vp-react-ts-shadcn': patch
'@pauldvlp/vp-pkg-shadcn': patch
---

Fix `spawnSync pnpm ENOENT` on Windows when the generated CLI runs its post-scaffold scripts (`pnpm install`, `pnpm exec shadcn ...`). On Windows, `pnpm`/`npm` are PATH-resolved `.cmd` shims that `execFileSync` cannot spawn without a shell; the runtime now enables `shell: true` on `win32` only, matching the fix already applied to this repo's own install smoke test.
