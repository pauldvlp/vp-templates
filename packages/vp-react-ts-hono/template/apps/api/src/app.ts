import { Hono } from 'hono'
import { logger } from 'hono/logger'
// __SERVEWEB_IMPORT__
// __OPENAPI_IMPORT__
import { health } from './routes/health'
import { items } from './routes/items'

export const app = new Hono()

app.use(logger())
// __OPENAPI_SETUP__

// Mount the API surface under `/api`, mirroring the web app's dev proxy (see apps/web/vite.config.ts).
const api = app.basePath('/api')
api.route('/health', health)
api.route('/items', items)
// __SERVEWEB_STATIC__
