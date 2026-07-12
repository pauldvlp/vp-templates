import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'
import { defineConfig, lazyPlugins } from 'vite-plus'

// https://vite.dev/config/
export default defineConfig({
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
  plugins: lazyPlugins(() => [react(), tailwindcss(), babel({ presets: [reactCompilerPreset()] })]),
  resolve: {
    alias: {
      '@app/website': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
