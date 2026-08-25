import path from "node:path"
import { fileURLToPath } from "node:url"
import { reactRouter } from "@react-router/dev/vite"
import { defineConfig } from "vite"

export default defineConfig({
  server: {
    port: 3000,
    host: "localhost",
  },
  preview: {
    port: 3000,
    host: "localhost",
  },
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [reactRouter()],
  resolve: {
    alias: {
      "~": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "app"),
    },
  },
})
