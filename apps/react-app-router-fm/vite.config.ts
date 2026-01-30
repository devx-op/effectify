/// <reference types='vitest' />

import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { nxCopyAssetsPlugin } from "@nx/vite/plugins/nx-copy-assets.plugin"
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import { reactRouter } from "@react-router/dev/vite"
import { defineConfig } from "vite"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const plugins = [
  ...(process.env.VITEST ? [] : [reactRouter()]),
  nxViteTsPaths(),
  nxCopyAssetsPlugin([
    {
      // Copy all markdown files from the root of the project
      input: "",
      glob: "*.md",
      output: ".",
    },
  ]),
  {
    name: "ignore-chrome-devtools",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/.well-known/appspecific")) {
          res.statusCode = 204
          return res.end()
        }
        next()
      })
    },
  },
].filter(Boolean)

export default defineConfig({
  root: __dirname,
  cacheDir: "../../node_modules/.vite/apps/react-app-router-fm",
  server: {
    port: 3000,
    host: "localhost",
  },
  preview: {
    port: 3000,
    host: "localhost",
  },
  // @ts-expect-error - Multiple Vite versions causing type incompatibility
  plugins,
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  build: {
    outDir: "../../dist/apps/react-app-router-fm",
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
