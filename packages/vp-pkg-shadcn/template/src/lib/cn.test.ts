import { describe, expect, it } from 'vite-plus/test'

import { cn } from './utils'

// Infra-free smoke test over the `cn` helper shadcn generates in `lib/utils.ts` (clsx + tailwind-merge).
// Every shadcn component composes classes through it, so keeping it honest here catches drift in
// `clsx` / `tailwind-merge` before it reaches the components that depend on it.
describe('cn', () => {
  it('joins class names', () => {
    expect(cn('px-2', 'text-sm')).toBe('px-2 text-sm')
  })

  it('drops falsy values (clsx)', () => {
    expect(cn('px-2', false, null, undefined, 'text-sm')).toBe('px-2 text-sm')
  })

  it('de-duplicates conflicting tailwind utilities, last wins (tailwind-merge)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})
