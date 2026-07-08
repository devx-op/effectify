import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      "@effectify/hatchet": resolve(__dirname, "../../packages/hatchet/src/index.ts"),
    },
    conditions: ["@effectify/source"],
  },
  test: {
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/unit/e2e/**"],
    globals: true,
  },
  esbuild: {
    target: "node22",
  },
})
