import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  root: __dirname,
  test: {
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/unit/e2e/**"],
    globals: true,
  },
  esbuild: {
    target: "node22",
  },
})
