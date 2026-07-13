import { createItemSchema, type Item } from '@app/contracts'
import { sValidator } from '@hono/standard-validator'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

/** A throwaway in-memory store so the template runs with zero infra. Swap for a real repository. */
const store: Item[] = []

export const items = new Hono()
  .get('/', (c) => c.json(store))
  .get('/:id', (c) => {
    const item = store.find((i) => i.id === c.req.param('id'))
    if (!item) throw new HTTPException(404, { message: `Item ${c.req.param('id')} not found` })
    return c.json(item)
  })
  // `sValidator` validates the body against the shared Zod contract via Standard Schema (so Zod Mini
  // works untouched) and — unlike a hand-rolled parse — feeds the input type into `AppType`, so the RPC
  // client's `$post({ json })` payload is checked at compile time. `c.req.valid('json')` is typed CreateItem.
  .post('/', sValidator('json', createItemSchema), (c) => {
    const body = c.req.valid('json')
    const item: Item = { id: crypto.randomUUID(), name: body.name, createdAt: new Date().toISOString() }
    store.push(item)
    return c.json(item, 201)
  })
