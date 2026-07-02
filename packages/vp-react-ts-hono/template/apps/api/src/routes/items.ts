import { createItemSchema, type Item } from '@app/contracts'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

import { parse } from '../lib/validate'

/** A throwaway in-memory store so the template runs with zero infra. Swap for a real repository. */
const store: Item[] = []

export const items = new Hono()
  .get('/', (c) => c.json(store))
  .get('/:id', (c) => {
    const item = store.find((i) => i.id === c.req.param('id'))
    if (!item) throw new HTTPException(404, { message: `Item ${c.req.param('id')} not found` })
    return c.json(item)
  })
  .post('/', async (c) => {
    const body = parse(createItemSchema, await c.req.json().catch(() => null))
    const item: Item = { id: crypto.randomUUID(), name: body.name, createdAt: new Date().toISOString() }
    store.push(item)
    return c.json(item, 201)
  })
