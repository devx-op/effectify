import { defineConfig } from "vitest/config"

export default defineConfig({
  root: __dirname,
  cacheDir: "../../../node_modules/.vite/packages/app-builder/contracts",
  test: {
    name: "@effectify/app-builder-contracts",
    environment: "node",
    include: ["tests/**/*.test.ts"],
    reporters: ["default"],
    watch: false,
  },
})
