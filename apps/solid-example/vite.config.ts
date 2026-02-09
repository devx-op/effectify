import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import tailwindcss from "@tailwindcss/vite"

import { tanstackStart } from "@tanstack/solid-start/plugin/vite"
import solidPlugin from "vite-plugin-solid"

import lucidePreprocess from "vite-plugin-lucide-preprocess"
import { fileURLToPath } from "node:url"

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [
    lucidePreprocess(),
    devtools(),
    // this is the plugin that enables path aliases
    nxViteTsPaths(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
      router: {
        entry: "router.tsx",
        routeToken: "layout",
      },
    }),
    solidPlugin({ ssr: true }),
  ],
})
