import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  root: __dirname,
  cacheDir: "../../../node_modules/.vite/packages/app-builder/nx-plugin",
  resolve: {
    alias: {
      "@effectify/app-builder-generation": fileURLToPath(new URL("../generation/src/index.ts", import.meta.url)),
    },
  },
  test: { name: "@effectify/app-builder-nx-plugin", environment: "node", include: ["tests/**/*.test.ts"], watch: false },
})
