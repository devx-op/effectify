import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  root: __dirname,
  cacheDir: "../../../node_modules/.vite/packages/app-builder/generation",
  resolve: {
    alias: {
      "@effectify/app-builder-contracts": fileURLToPath(new URL("../contracts/src/index.ts", import.meta.url)),
      "@effectify/app-builder-generation": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
    },
  },
  test: {
    name: "@effectify/app-builder-generation",
    environment: "node",
    include: ["tests/**/*.test.ts"],
    watch: false,
  },
})
