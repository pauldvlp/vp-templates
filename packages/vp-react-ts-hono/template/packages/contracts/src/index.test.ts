import { describe, expect, it } from 'vite-plus/test'

import { createItemSchema, itemSchema } from './index'

// A fast, infra-free smoke test that proves the shared contracts parse as expected. Both ends
// depend on these schemas, so keeping them honest here catches drift before it reaches api or web.
describe('item contracts', () => {
  it('accepts a well-formed item', () => {
    const item = { id: 'itm_1', name: 'Widget', createdAt: '2026-01-01T00:00:00.000Z' }
    expect(itemSchema.parse(item)).toEqual(item)
  })

  it('rejects a create payload with an empty name', () => {
    expect(() => createItemSchema.parse({ name: '' })).toThrow()
  })
})
