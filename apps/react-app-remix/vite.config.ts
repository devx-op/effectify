import path from 'node:path'
import { vitePlugin as remix } from '@remix-run/dev'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [remix()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
    },
  },
})
