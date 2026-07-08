import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    setupFiles: [path.join(__dirname, "setup-tests.ts")],
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    globals: true,
  },
  resolve: {
    alias: {
      "@effectify/hatchet": path.join(__dirname, "src/index.ts"),
    },
  },
  esbuild: {
    target: "node22",
  },
})
