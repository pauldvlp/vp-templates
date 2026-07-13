# __PROJECT_NAME__

Monorepo full-stack basado en [Vite+](https://viteplus.dev): **una app web (React)** + un **api (Hono)** conectados por el **RPC type-safe** de Hono, con **contratos Zod** compartidos.

```
.
├── apps/
│   ├── web        # @app/web — React + Vite+, proxea /api al backend
│   └── api        # @app/api — Hono, conformado a la toolchain de Vite+
└── packages/
    └── contracts  # @app/contracts — schemas Zod + tipos compartidos (única fuente de verdad)
```

## Requisitos

- Node `>=22.18.0`
- pnpm `11.9.0` (se descarga solo vía `devEngines`)
- CLI `vp` (Vite+) instalado globalmente

## Empezar

```bash
vp install          # si aún no se instaló al crear el proyecto
vp run -r dev       # levanta web + api juntos
```

- Web: <http://localhost:__WEB_PORT__>
- API: <http://localhost:__API_PORT__/api> (p.ej. `/api/health`, `/api/items`)

El front llama a `/api/*` y Vite+ lo **proxea** al api en dev (mismo origen, sin CORS).

## Scripts (raíz)

| Script            | Qué hace                                              |
| ----------------- | ----------------------------------------------------- |
| `vp run -r dev`   | Levanta web + api a la vez                            |
| `vp check`        | Formatea, lintea y type-checkea todo el workspace     |
| `vp run -r build` | Buildea todos los paquetes                            |
| `vp test`         | Corre los tests (vite-plus/test) de todo el workspace |
| `pnpm ready`      | `vp check` + build (pensado para CI)                  |

## Cómo está cableado el `api` (Hono sobre Vite+)

Hono es TypeScript plano — sin decoradores, sin metadata — así que el `api` es un paquete vite-plus
normal, sin plugins de transform:

- **`vp run @app/api#dev`** → `vite-node --watch src/main.ts` (reinicio limpio en cada cambio: el
  bloque `import.meta.hot.dispose` en `main.ts` cierra el server antes de re-ejecutar).
- **`vp build`** → build **SSR** de Vite que externaliza `node_modules` y emite `dist/main.js`
  (arráncalo con `node dist/main.js` o `vp run @app/api#start`).
- **`vp check` / `vp test`** → incluyen el `api` automáticamente.

La app Hono vive en `src/app.ts` (montada bajo `/api`); el server Node (`@hono/node-server`) se arranca
en `src/main.ts`.

## Contratos compartidos (`@app/contracts`)

Los schemas Zod viven en `packages/contracts` y son la única fuente de verdad de las **formas de datos**:

- El **api** valida los bodies con `sValidator` (`@hono/standard-validator`) contra esos schemas. Va por
  *Standard Schema*, así que los contratos en Zod Mini funcionan sin tocarlos y —a diferencia de un parse
  a mano— el tipo del input entra en `AppType`, con lo que el cliente RPC comprueba el payload en compile-time.
- La **web** no tipa `fetch` a mano: consume la API por el cliente RPC (ver abajo).

## RPC type-safe (web ⇄ api)

`apps/api/src/app.ts` registra las rutas en una expresión encadenada y exporta su tipo:

```ts
const api = new Hono().route('/health', health).route('/items', items)
export const routes = app.route('/api', api)
export type AppType = typeof routes
```

La **web** crea un cliente tipado con ese `AppType` y llama a la API sin URLs ni casts a mano — rutas,
params, body y respuesta se infieren solos:

```ts
import { hc } from 'hono/client'
import type { AppType } from '@app/api'

const client = hc<AppType>('/') // `/api/*` va por el proxy de Vite+ en dev (mismo origen)
const items = await (await client.api.items.$get()).json() //     Item[]
await client.api.items.$post({ json: { name: 'Widget' } }) //     body chequeado en compile-time
```

Si renombras una ruta o cambias un contrato, el front **deja de compilar**: el cableado está tipado de
punta a punta, no solo la forma del payload. (En un `$post`, el 201 y el 400 del validator forman una
unión discriminada — estrecha con `res.ok` para quedarte con el tipo de éxito.)

## Configuración y logs

- **Env**: `apps/api/src/env.ts` valida `process.env` con Zod al arrancar (falla rápido). Copia
  `apps/api/.env.example` a `.env`.
- **Logs**: middleware `logger()` de Hono (una línea por request en la misma terminal que la web).

<!-- OPENAPI:START -->
## OpenAPI + Swagger UI

El RPC tipa el consumo interno web ⇄ api; **OpenAPI documenta la API para consumidores externos** (otros
lenguajes, terceros). La documentación interactiva (Swagger UI) se sirve en
<http://localhost:__API_PORT__/docs> y el documento OpenAPI en crudo en `/docs.json`. Con el api levantado
(`vp run -r dev`), compruébalo:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:__API_PORT__/docs       # 200
curl -s http://localhost:__API_PORT__/docs.json | head -c 200                     # JSON OpenAPI
```

El documento se **genera desde los contratos Zod** (`z.toJSONSchema` en `apps/api/src/openapi.ts`), así
que la doc nunca se desincroniza de lo que el api valida. Para documentar un endpoint nuevo, añade su
entrada en `paths` reutilizando el schema de `@app/contracts`.

<!-- OPENAPI:END -->
<!-- SERVEWEB:START -->
## El api sirve el web (single deployable)

Con `--serveWeb`, el api monta `apps/web/dist` con el `serveStatic` de `@hono/node-server` (las rutas
`/api/*` se registran antes, así que tienen prioridad), de modo que un solo proceso sirve front + API.
Es para **producción** (en dev se usa el proxy). Compruébalo:

```bash
vp run -r build                 # genera apps/web/dist y apps/api/dist
vp run @app/api#start           # arranca el api (equivale a node apps/api/dist/main.js)
# el api sirve el front y la API en el mismo puerto:
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:__API_PORT__/            # 200 (index.html)
curl -s http://localhost:__API_PORT__/api/health                                  # {"status":"ok"}
```

El montaje del estático vive en `apps/api/src/main.ts` (el entrypoint de Node), no en `app.ts`: así
`app.ts` queda libre de APIs de Node y su `AppType` se puede importar desde la web sin arrastrar tipos de
Node al bundle del navegador. La ruta al `dist` de la web se resuelve como **absoluta** a partir de
`import.meta.dirname`, así que funciona sea cual sea el directorio de trabajo.

<!-- SERVEWEB:END -->
<!-- DOCKER:START -->
## Docker

El `api` trae un `Dockerfile` multi-stage (`apps/api/Dockerfile`). El **contexto de build debe ser la
raíz del monorepo** (el api se construye desde todo el workspace):

```bash
docker build -f apps/api/Dockerfile -t __PROJECT_NAME__-api .
docker run --rm -p __API_PORT__:__API_PORT__ -e PORT=__API_PORT__ __PROJECT_NAME__-api
# en otra terminal, comprueba:
curl -s http://localhost:__API_PORT__/api/health                                  # {"status":"ok"}
```

Es un punto de partida (la imagen incluye el workspace completo). Para una imagen más liviana, parte
de `pnpm deploy --filter @app/api --prod`.

<!-- DOCKER:END -->
## Añadir un recurso

Mira `apps/api/src/routes/items.ts` (rutas Hono con store en memoria) y `health.ts` como plantillas,
declara su contrato en `packages/contracts` y valida los bodies con `sValidator('json', schema)`. Encadena
la ruta nueva en `app.ts` (`.route('/loquesea', loquesea)`) para que entre en `AppType` y el cliente RPC
de la web la vea con tipos.
