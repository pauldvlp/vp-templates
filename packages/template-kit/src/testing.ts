// Test-only helpers shared by every generator's __tests__/*.test.ts. Kept in a separate subpath
// (@pauldvlp/template-kit/testing) so it never reaches a generator's bundled dist — the esbuild
// alias only maps the package root ("." → index.ts), and this file imports `vitest`.
import { expect } from 'vitest';

import type { Template } from './index.ts';

/**
 * A produced tree, typed for assertions. The real type is `Tree = { [name: string]: string | Tree }`,
 * which is honest but unusable here: every `files.apps.api['package.json']` would need narrowing that
 * buys no safety, since a test already knows the shape it just generated. Modelling each node as both
 * indexable and a string keeps assertions flat. Test-only — this subpath never reaches a bundled dist.
 */
export type ProducedTree = { readonly [name: string]: string & ProducedTree };

/**
 * Run a template's `produce()` with the real `{ options }` signature, assert it emits post-scaffold
 * scripts (a wiring contract every template shares), and return the in-memory file tree to assert on.
 */
export async function produce<O>(template: Template<O>, options: O): Promise<ProducedTree> {
  const { files, scripts } = await template.produce({ options });
  expect(Array.isArray(scripts) && scripts!.length > 0, 'emits post-scaffold scripts').toBe(true);
  return files as unknown as ProducedTree;
}
