import { serve } from '@hono/node-server'
// __SERVEWEB_IMPORT__

import { app } from './app'
import { env } from './env'

// __SERVEWEB_STATIC__
const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`api listening on http://localhost:${info.port}`)
})

// Clean restart under `vite-node --watch`: `accept()` makes vite-node re-execute this module in place
// (a plain change would full-reload without disposing), and `dispose` closes the running server first
// so the next boot doesn't hit EADDRINUSE on the same port. `import.meta.hot` is undefined in the
// production SSR build, so this whole block is tree-shaken away there.
if (import.meta.hot) {
  import.meta.hot.accept()
  import.meta.hot.dispose(() => server.close())
}
