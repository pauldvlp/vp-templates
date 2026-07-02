import type { Item } from '@app/contracts'
import { useEffect, useState, type FormEvent } from 'react'

// `/api/*` is proxied to the Hono server in dev (see vite.config.ts), so these are same-origin calls.
const fetchItems = (): Promise<Item[]> => fetch('/api/items').then((res) => res.json())

const createItem = (name: string): Promise<Item> =>
  fetch('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  }).then((res) => res.json())

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
