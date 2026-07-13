import { Hono } from 'hono'
import { logger } from 'hono/logger'
// __OPENAPI_IMPORT__
import { health } from './routes/health'
import { items } from './routes/items'

export const app = new Hono()

app.use(logger())
// __OPENAPI_SETUP__

// Mount the API surface under `/api`, mirroring the web app's dev proxy (see apps/web/vite.config.ts).
// Routes are registered as one chained expression so their full shape — every path, its params, request
// body and response — is captured in `AppType`. apps/web consumes that type through Hono's RPC client
// (`hc<AppType>`), so the front-end is typed end-to-end. Keep new routes in this chain to stay in sync.
const api = new Hono().route('/health', health).route('/items', items)
export const routes = app.route('/api', api)

export type AppType = typeof routes
