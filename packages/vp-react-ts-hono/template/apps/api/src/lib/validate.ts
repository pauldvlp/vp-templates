import { HTTPException } from 'hono/http-exception'
import { flattenError, type ZodMiniType } from 'zod/v4-mini'

/**
 * Minimal, zero-dependency bridge between Zod and Hono. Parse an untrusted value against a schema
 * from `@app/contracts`; on failure throw a 400 whose JSON body is the flattened Zod error (Hono's
 * default error handler renders the attached `res`). On success the return value is fully typed.
 *
 *   const body = parse(createItemSchema, await c.req.json().catch(() => null))
 */
export function parse<T>(schema: ZodMiniType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new HTTPException(400, { res: Response.json(flattenError(result.error), { status: 400 }) })
  }
  return result.data
}
