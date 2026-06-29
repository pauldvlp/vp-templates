import * as z from 'zod/v4-mini'

/** Validate `process.env` at boot — the app fails fast with a clear error if something is missing. */
export const envSchema = z.object({
  NODE_ENV: z._default(z.enum(['development', 'production', 'test']), 'development'),
  PORT: z._default(z.coerce.number(), __API_PORT__)
})

export type Env = z.infer<typeof envSchema>

/** DI token for the parsed, validated environment. */
export const ENV = Symbol('ENV')

export const loadEnv = (): Env => envSchema.parse(process.env)
