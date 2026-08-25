import path from "node:path"
import { reactRouter } from "@react-router/dev/vite"
import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"

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
      "~": path.resolve(__dirname, "app"),
    },
  },
})
