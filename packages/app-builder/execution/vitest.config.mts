import { defineConfig } from "vitest/config"

export default defineConfig({
  root: __dirname,
  cacheDir: "../../../node_modules/.vite/packages/app-builder/execution",
  test: {
    name: "@effectify/app-builder-execution",
    environment: "node",
    include: ["tests/**/*.test.ts"],
    reporters: ["default"],
    watch: false,
    coverage: {
      provider: "v8",
      include: [
        "src/lifecycle.ts",
        "src/transition-evidence.ts",
        "src/automatic-policy.ts",
        "src/failure.ts",
        "src/index.ts",
        "src/run-executor.ts",
        "src/workspace-lock.ts",
        "src/cleanup.ts",
        "src/cleanup-finalization.ts",
        "src/durable-file-system.ts",
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        statements: 95,
        branches: 90,
      },
    },
  },
})
