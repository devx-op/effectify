import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import { defineConfig } from "vitest/config"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  root: __dirname,
  plugins: [nxViteTsPaths()],
  test: {
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["tests/browser/**", "**/node_modules/**", "**/dist/**"],
    globals: true,
  },
  esbuild: {
    target: "node22",
  },
})
