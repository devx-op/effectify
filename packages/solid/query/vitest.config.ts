import { defineConfig } from "vitest/config"

export default defineConfig({
  root: __dirname,
  test: {
    environment: "node",
    allowOnly: false,
    include: ["tests/**/*.test.ts"],
  },
})
