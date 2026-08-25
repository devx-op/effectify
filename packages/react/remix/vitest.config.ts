import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import { defineConfig } from "vitest/config"

export default defineConfig({
  root: __dirname,
  plugins: [nxViteTsPaths()],
  test: {
    environment: "node",
    allowOnly: false,
    include: ["tests/**/*.test.ts"],
  },
})
