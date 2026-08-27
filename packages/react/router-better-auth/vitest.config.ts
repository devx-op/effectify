import { resolve } from "node:path"
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import { defineConfig } from "vitest/config"

export default defineConfig({
  root: __dirname,
  plugins: [nxViteTsPaths()],
  resolve: {
    alias: {
      "@effectify/node-better-auth": resolve(__dirname, "../../node/better-auth/src/index.ts"),
      "@effectify/react-router": resolve(__dirname, "../router/src/index.ts"),
    },
    conditions: ["@effectify/source"],
  },
  test: {
    environment: "node",
    allowOnly: false,
    include: ["tests/**/*.test.ts"],
  },
})
