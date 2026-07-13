import type { AppType } from '@app/api'
import type { Item } from '@app/contracts'
import { hc } from 'hono/client'
import { useEffect, useState, type FormEvent } from 'react'

// Hono's typed RPC client: routes, params, request bodies and responses are all inferred from the api's
// `AppType` (see apps/api/src/app.ts) — no hand-written URLs, no response casts. `/api/*` is proxied to
// the Hono server in dev (see vite.config.ts), so a `/` base keeps these same-origin.
const client = hc<AppType>('/')

const fetchItems = async (): Promise<Item[]> => {
  const res = await client.api.items.$get()
  return res.json()
}

const createItem = async (name: string): Promise<Item> => {
  // The 201 body and the validator's 400 form a discriminated union; narrow on `res.ok` to get `Item`.
  const res = await client.api.items.$post({ json: { name } })
  if (!res.ok) throw new Error('Failed to create item')
  return res.json()
}

export const App = () => {
  const [items, setItems] = useState<Item[]>([])
  const [name, setName] = useState('')

  useEffect(() => {
    void fetchItems().then(setItems)
  }, [])

  const add = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    const created = await createItem(name.trim())
    setItems((prev) => [...prev, created])
    setName('')
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>Vite+ · React + Hono</h1>
      <p>A minimal full-stack starter. The list below is served by the Hono api.</p>

      <form onSubmit={add} style={{ display: 'flex', gap: 8, margin: '1.5rem 0' }}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder='New item name' style={{ flex: 1, padding: 8 }} />
        <button type='submit'>Add</button>
      </form>

      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
      {items.length === 0 && <p style={{ opacity: 0.6 }}>No items yet — add one above.</p>}
    </main>
  )
}
