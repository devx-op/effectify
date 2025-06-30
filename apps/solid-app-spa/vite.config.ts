import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [TanStackRouterVite({ target: 'solid', autoCodeSplitting: true }), solidPlugin(), tailwindcss()],
})
