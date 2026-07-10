import { defineConfig } from 'vitest/config'

// Fast inner-loop check for the generators: each package's __tests__/ exercises its produce() in
// memory (no registry, npm install, or shadcn) and asserts the emitted tree, scope/name substitution,
// and per-option wiring. Tests live next to their package so a template PR only ever touches its own
// files. For the full `vp create @pauldvlp:...` path see CONTRIBUTING.md (Verdaccio / smoke:install).
export default defineConfig({
  test: {
    include: ['packages/*/__tests__/**/*.test.ts'],
    environment: 'node',
  },
})
