import { nxCopyAssetsPlugin } from "@nx/vite/plugins/nx-copy-assets.plugin"
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import { defineConfig } from "vitest/config"

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: "../../../node_modules/.vite/packages/loom/nitro",
  plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(["*.md"])],
  test: {
    name: "@effectify/loom-nitro",
    watch: false,
    globals: true,
    environment: "node",
    include: ["{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    reporters: ["default"],
    coverage: {
      reportsDirectory: "../../../coverage/packages/loom/nitro",
      provider: "v8" as const,
    },
  },
}))
