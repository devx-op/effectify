/// <reference types='vitest' />

import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { nxCopyAssetsPlugin } from "@nx/vite/plugins/nx-copy-assets.plugin"
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import { reactRouter } from "@react-router/dev/vite"
import { defineConfig, PluginOption } from "vite"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const plugins = [
  ...(process.env.VITEST ? [] : [reactRouter()]),
  nxViteTsPaths() as Plugin,
  nxCopyAssetsPlugin([
    {
      // Copy all markdown files from the root of the project
      input: "",
      glob: "*.md",
      output: ".",
    },
  ]),
].filter(Boolean)

export default defineConfig({
  root: __dirname,
  cacheDir: "../../node_modules/.vite/apps/react-app-router-fm",
  server: {
    port: 3000,
    host: "localhost",
    proxy: {
      "/api/auth": {
        target: "http://localhost:3001",
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            // Pass cookies from the original request
            if (req.headers.cookie) {
              proxyReq.setHeader("cookie", req.headers.cookie)
            }
          })
        },
      },
    },
  },
  preview: {
    port: 3000,
    host: "localhost",
  },
  plugins: plugins as PluginOption[],
  ssr: {
    external: [
      "better-sqlite3",
      "better-auth",
      "@prisma/client",
      "@prisma/adapter-better-sqlite3",
    ],
  },
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  build: {
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
