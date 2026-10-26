import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@escrcpy/shared': fileURLToPath(new URL('./packages/shared/src/index.ts', import.meta.url)),
      '$': fileURLToPath(new URL('./desktop/src', import.meta.url)),
      '$root': fileURLToPath(new URL('./desktop', import.meta.url)),
      '$electron': fileURLToPath(new URL('./desktop/electron', import.meta.url)),
      '$renderer': fileURLToPath(new URL('./desktop/src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['packages/**/test/**/*.spec.{js,ts}', 'desktop/**/test/**/*.spec.{js,ts}'],
  },
})
