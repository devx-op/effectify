import path from 'node:path'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    setupFiles: [path.join(__dirname, 'setup-tests.ts')],
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'inspiration/**'],
    globals: true,
  },
  resolve: {
    alias: {
      '@template/basic/test': path.join(__dirname, 'test'),
      '@template/basic': path.join(__dirname, 'src'),
      '@prisma/effect': path.join(__dirname, 'prisma/generated/effect'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  esbuild: {
    target: 'node22',
  },
})
