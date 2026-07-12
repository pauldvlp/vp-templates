import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'
import { defineConfig, lazyPlugins } from 'vite-plus'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: __WEB_PORT__,
    // Same-origin in dev: requests to `/api/*` are forwarded to the Hono server, so no CORS and no
    // absolute API URLs in the client code.
    proxy: {
      '/api': 'http://localhost:__API_PORT__'
    }
  },
  lint: {
    plugins: ['react', 'typescript', 'oxc'],
    rules: {
      'react/rules-of-hooks': 'error',
      'react/only-export-components': [
        'warn',
        {
          allowConstantExport: true
        }
      ],
      'vite-plus/prefer-vite-plus-imports': 'error'
    },
    jsPlugins: [
      {
        name: 'vite-plus',
        specifier: 'vite-plus/oxlint-plugin'
      }
    ]
  },
  plugins: lazyPlugins(() => [react(), babel({ presets: [reactCompilerPreset()] })]),
  resolve: {
    alias: {
      '@app/web': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
