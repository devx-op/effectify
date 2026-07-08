import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      "~": resolve(__dirname, "app"),
    },
    conditions: ["@effectify/source"],
  },
  test: {
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/build/**"],
    globals: true,
  },
  esbuild: {
    target: "node22",
  },
})
