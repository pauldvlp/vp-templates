import * as z from 'zod/v4-mini'

/**
 * Shared API contracts. Both ends import from here so there is a single source of truth:
 * the api validates request bodies against these schemas (via the ZodValidationPipe) and the
 * web app uses the inferred types to type its `fetch` responses. Zod Mini keeps the bundle small
 * for the shared package — its functional API (`z.pick`, `.check(...)`) replaces the chained methods.
 */

export const itemSchema = z.object({
  id: z.string(),
  name: z.string().check(z.minLength(1)),
  createdAt: z.string()
})

export const createItemSchema = z.pick(itemSchema, { name: true })

export type Item = z.infer<typeof itemSchema>
export type CreateItem = z.infer<typeof createItemSchema>
