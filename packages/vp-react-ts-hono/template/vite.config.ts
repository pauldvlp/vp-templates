import { defaultExclude, defineConfig } from 'vite-plus'

export default defineConfig({
  test: {
    // vite-plus's defaultExclude is only node_modules + .git (no dist), so a root-level
    // `vp test` would otherwise scan compiled build output. Keep build outputs out of the scan.
    exclude: [...defaultExclude, '**/dist/**', '**/build/**']
  },
  fmt: {
    jsxSingleQuote: true,
    printWidth: 160,
    semi: false,
    singleQuote: true,
    trailingComma: 'none'
  },
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
    options: { typeAware: true, typeCheck: true }
  },
  run: {
    cache: true
  }
})
