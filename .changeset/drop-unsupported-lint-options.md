---
"@pauldvlp/vp-react-ts-hono": patch
"@pauldvlp/vp-react-ts-nestjs": patch
"@pauldvlp/vp-react-ts-shadcn": patch
---

Remove the unsupported `lint.options` (`typeAware`/`typeCheck`) block from every subpackage `vite.config.ts`. oxlint only honors these in the root config, so they were a no-op in `apps/*` and `packages/*`. The root config of each template keeps them.
