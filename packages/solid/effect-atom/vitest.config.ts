import * as path from 'node:path'
import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [solid()],
  test: {
    include: ['./test/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./vitest-setup.ts'],
  },
  resolve: {
    alias: {
      '@effect-atom/atom-solid/test': path.join(__dirname, 'test'),
      '@effect-atom/atom-solid': path.join(__dirname, 'src'),
    },
    conditions: ['development', 'browser'],
  },
})
