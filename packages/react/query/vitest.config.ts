import { defineConfig } from "vitest/config"

export default defineConfig({
  root: __dirname,
  test: {
    environment: "jsdom",
    allowOnly: false,
    include: ["tests/**/*.test.ts"],
  },
})
