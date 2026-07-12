import { defineConfig } from 'vite-plus'

// NestJS relies on `emitDecoratorMetadata` for its dependency injection. vite-plus's built-in Oxc
// transform emits it natively (driven by `experimentalDecorators` + `emitDecoratorMetadata` in
// tsconfig.json), so no extra transform plugin is needed — the api is a plain vite-plus package and
// `vp check` / `vp test` pick it up with zero wiring.
export default defineConfig({
  build: {
    // SSR build: bundle the entry to dist/main.js and externalize node_modules (so Nest's optional
    // dynamic requires aren't dragged into the bundle). The workspace contracts package is source
    // TypeScript, so it must be inlined rather than externalized — see `ssr.noExternal` below.
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
    jsPlugins: [
      {
        name: 'vite-plus',
        specifier: 'vite-plus/oxlint-plugin'
      }
    ]
  }
})
