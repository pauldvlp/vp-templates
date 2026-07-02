---
"@pauldvlp/vp-react-ts-shadcn": minor
"@pauldvlp/vp-pkg-shadcn": minor
---

Wire up the built-in Vitest runner in the shadcn templates: add a `test` script (`vp test`) and gate it in `ready`. Each ships an infra-free smoke test over the `cn` helper (`lib/utils.ts` — clsx + tailwind-merge) that shadcn generates, so class-name composition — which every shadcn component depends on — is guarded against dependency drift.
