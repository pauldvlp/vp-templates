import { defineConfig } from 'vite-plus'

// Hono is a plain TypeScript web framework — no decorators, no metadata — so the api is a plain
// vite-plus package with zero transform wiring. `vp check` / `vp test` pick it up automatically.
export default defineConfig({
  build: {
    // SSR build: bundle the entry to dist/main.js and externalize node_modules. The workspace contracts
    // package is source TypeScript, so it must be inlined rather than externalized — see `ssr.noExternal`.
    ssr: 'src/main.ts',
    outDir: 'dist',
    target: 'node22'
  },
  ssr: {
    noExternal: ['@app/contracts']
  },
  lint: {
    plugins: ['typescript', 'oxc'],
    rules: {
      'vite-plus/prefer-vite-plus-imports': 'error'
    },
    options: {
      typeAware: true,
      typeCheck: true
    },
    jsPlugins: [
      {
        name: 'vite-plus',
        specifier: 'vite-plus/oxlint-plugin'
      }
    ]
  }
})
