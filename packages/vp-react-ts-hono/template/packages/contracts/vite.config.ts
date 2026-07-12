import { defineConfig } from 'vite-plus'

export default defineConfig({
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
