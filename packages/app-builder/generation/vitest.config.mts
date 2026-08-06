import { defineConfig } from "vitest/config"

export default defineConfig({
  root: __dirname,
  cacheDir: "../../../node_modules/.vite/packages/app-builder/generation",
  test: { name: "@effectify/app-builder-generation", environment: "node", include: ["tests/**/*.test.ts"], watch: false },
})
