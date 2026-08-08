import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  root: __dirname,
  cacheDir: "../../../node_modules/.vite/packages/app-builder/cli",
  resolve: {
    alias: {
      "@effectify/app-builder-generation": fileURLToPath(new URL("../generation/src/index.ts", import.meta.url)),
    },
  },
  test: { name: "@effectify/app-builder-cli", environment: "node", include: ["tests/**/*.test.ts"], watch: false },
})
