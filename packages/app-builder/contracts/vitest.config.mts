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
    coverage: {
      provider: "v8",
      include: [
        "src/digest.ts",
        "src/identity-failure.ts",
        "src/reference.ts",
        "src/passive-record.ts",
        "src/replay-failure.ts",
        "src/replay.ts",
        "src/compatibility-failure.ts",
        "src/compatibility.ts",
        "src/index.ts",
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
