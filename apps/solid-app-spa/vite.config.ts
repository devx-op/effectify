import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import viteTsConfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackRouter({
      target: 'solid',
      routeToken: 'layout',
      autoCodeSplitting: true,
      routesDirectory: resolve(__dirname, './src/routes'),
      generatedRouteTree: resolve(__dirname, './src/routeTree.gen.ts'),
    }),
    solidPlugin(),
    tailwindcss(),
  ],
})
