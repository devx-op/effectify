import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["app/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    globals: true,
  },
  esbuild: {
    target: "node22",
  },
})
