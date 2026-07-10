// Test-only helpers shared by every generator's __tests__/*.test.ts. Kept in a separate subpath
// (@pauldvlp/template-kit/testing) so it never reaches a generator's bundled dist — the esbuild
// alias only maps the package root ("." → index.ts), and this file imports `vitest`.
import { expect } from 'vitest'

import type { Template } from './index.ts'

/**
 * Run a template's `produce()` with the real `{ options }` signature, assert it emits post-scaffold
 * scripts (a wiring contract every template shares), and return the in-memory file tree to assert on.
 */
export async function produce<O>(template: Template<O>, options: O) {
  const { files, scripts } = await template.produce({ options })
  expect(Array.isArray(scripts) && scripts!.length > 0, 'emits post-scaffold scripts').toBe(true)
  return files
}
