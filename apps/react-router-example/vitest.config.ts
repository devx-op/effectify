import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["app/**/*.test.ts", "test/browser/**/*.test.ts"],
    exclude: [
      "test/browser/**/*.browser.test.ts",
      "**/node_modules/**",
      "**/dist/**",
    ],
    globals: true,
  },
  esbuild: {
    target: "node22",
  },
})
