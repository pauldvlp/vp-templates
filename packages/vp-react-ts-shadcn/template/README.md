# @app/website

Monorepo mínimo basado en [Vite+](https://viteplus.dev): **una app frontend** + un **paquete de UI shadcn compartido**.

```
.
├── apps/
│   └── website        # @app/website — app React + Vite+ (Tailwind v4, React Compiler)
└── packages/
    └── ui             # @app/ui — design system shadcn (Tailwind v4)
```

## Requisitos

- Node `>=22.18.0`
- pnpm `11.9.0` (se descarga solo vía `devEngines`)
- CLI `vp` (Vite+) instalado globalmente

## Empezar

```bash
vp install                # si aún no se instaló al crear el proyecto
vp run @app/website#dev   # o: pnpm dev
```

## Scripts (raíz)

| Script                | Qué hace                                          |
| --------------------- | ------------------------------------------------- |
| `vp dev` / `pnpm dev` | Levanta `@app/website` en modo dev                |
| `vp check`            | Formatea, lintea y type-checkea todo el workspace |
| `vp run -r build`     | Buildea todos los paquetes                        |
| `pnpm ready`          | `vp check` + build (pensado para CI)              |

## Cómo está cableado

- **`packages/ui`** publica sus fuentes vía `exports` (sin paso de build):
  - `@app/ui/globals.css` — Tailwind v4 + tokens del tema (generados por shadcn)
  - `@app/ui/components/*` → `src/components/*.tsx` — shadcn escribe en `src/components/ui/`, así que los componentes se importan como `@app/ui/components/ui/<nombre>`
  - `@app/ui/lib/*` — utilidades (`cn`)
  - `@app/ui/hooks/*` — hooks
- **`apps/website`** consume `@app/ui` como `workspace:*` e importa `@app/ui/globals.css` en `main.tsx`.
- Tailwind escanea las fuentes de la app y de `ui` vía las directivas `@source` en `globals.css`.

## Iconos

La librería de iconos (la que elegiste con `--iconLibrary`) está declarada como dependencia tanto
en `packages/ui` como en `apps/website`, así que **puedes usar iconos directamente en el website**:

```tsx
// hugeicons (por defecto)
import { Home01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

<HugeiconsIcon icon={Home01Icon} />
```

```tsx
// lucide → import { Home } from 'lucide-react'
// tabler → import { IconHome } from '@tabler/icons-react'
// radix  → import { HomeIcon } from '@radix-ui/react-icons'
```

> Se importan **directamente** del paquete de iconos (no re-exportados desde `@app/ui`): los named
> imports son tree-shakeables y evitan inflar el grafo de módulos.

## Añadir componentes shadcn

Desde la raíz, contra el paquete `ui`:

```bash
pnpm --filter @app/ui exec shadcn add <componente>
```

## Cambiar el tema (preset shadcn)

El tema (color, fuentes, radius, baseColor) lo define un **preset de shadcn**. Genera uno en
<https://ui.shadcn.com> (copia el preset code) y reaplícalo:

```bash
pnpm --filter @app/ui exec shadcn init --preset <code> --no-reinstall -y -f
```
