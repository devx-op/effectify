import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import { LoomVite } from "../../packages/loom/vite/src/index.ts"
import { defineConfig } from "vitest/config"

export default defineConfig({
  root: __dirname,
  cacheDir: "../../node_modules/.vite/apps/loom-example-app",
  plugins: [nxViteTsPaths(), LoomVite.loom()],
  test: {
    name: "@effectify/loom-example-app",
    watch: false,
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    reporters: ["default"],
    coverage: {
      reportsDirectory: "../../coverage/apps/loom-example-app",
      provider: "v8",
    },
  },
})
