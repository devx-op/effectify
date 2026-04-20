import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import type { Plugin } from "vite"
import { defineConfig } from "vitest/config"

const loomExampleVitePlugin = (): Plugin => ({
  name: "effectify:loom-vite",
})

export default defineConfig({
  root: __dirname,
  cacheDir: "../../node_modules/.vite/apps/loom-example-app",
  plugins: [nxViteTsPaths(), loomExampleVitePlugin()],
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
