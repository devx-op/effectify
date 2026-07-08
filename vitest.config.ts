import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    projects: [
      "**/vite.config.{mjs,js,ts,mts}",
      "**/vitest.config.{mjs,js,ts,mts}",
      "!apps/react-remix-example/vite.config.ts",
      "!apps/react-router-example/vite.config.ts",
    ],
  },
})
