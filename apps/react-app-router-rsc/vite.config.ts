import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc/plugin'
import { defineConfig } from 'vite'
import devtoolsJson from 'vite-plugin-devtools-json'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    rsc({
      entries: {
        client: 'src/entry.browser.tsx',
        rsc: 'src/entry.rsc.tsx',
        ssr: 'src/entry.ssr.tsx',
      },
      serverComponentsExternalPackages: ['react', 'react-dom'],
      generateTypes: true,
    }),
    devtoolsJson(),
  ],
  server: {
    port: 5186,
  },
})
