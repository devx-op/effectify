import { defineConfig } from "vitest/config"

export default defineConfig({
  root: __dirname,
  cacheDir: "../../../node_modules/.vite/packages/app-builder/e2e",
  test: {
    name: "@effectify/app-builder-e2e",
    environment: "node",
    include: ["tests/**/*.test.ts"],
    watch: false,
  },
})
