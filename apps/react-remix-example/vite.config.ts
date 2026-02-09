import path from "node:path"
import { vitePlugin as remix } from "@remix-run/dev"
import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [remix()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "app"),
    },
  },
})
