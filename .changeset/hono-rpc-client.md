---
'@pauldvlp/vp-react-ts-hono': minor
---

Wire the React web app to the Hono api through Hono's type-safe RPC client instead of raw `fetch`.

- The api registers its routes as one chained expression and exports the resulting `AppType`; the web builds a typed client with `hc<AppType>('/')`, so routes, params, request bodies and responses are all inferred — renaming a route or changing a contract now breaks the front-end at compile time, not just the payload shape.
- Request bodies are validated with `sValidator` (`@hono/standard-validator`) against the shared Zod contracts. Going through Standard Schema keeps the Zod Mini contracts untouched and feeds the input type into `AppType`, so the RPC client's `$post({ json })` payload is checked at compile time; this replaces the hand-rolled `parse()` bridge.
- The static-file mount moves from `app.ts` to the Node entry `main.ts`, keeping the exported `AppType` free of Node-only APIs (`node:path`, `import.meta.dirname`) so the web can import it for the RPC client without dragging them into its browser typecheck.
