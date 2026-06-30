---
"@pauldvlp/vp-react-ts-shadcn": patch
"@pauldvlp/vp-pkg-shadcn": patch
"@pauldvlp/vp-react-ts-nestjs": patch
---

Ship the template skeleton's manifests as `_package.json` (restored to `package.json` on scaffold via the RENAME map) so the published tarball no longer carries parseable nested `package.json` files. Supply-chain scanners were resolving the scaffolded app's full dependency tree from those manifests and mis-attributing its alerts to the generator; the generator's only real dependency is `@clack/prompts`. Generated projects are unchanged — they still receive a real `package.json`.
