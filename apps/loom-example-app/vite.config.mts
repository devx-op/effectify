import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import type { Plugin } from "vite"
import { defineConfig } from "vitest/config"
import { appPayloadElementId } from "./src/app-config.js"

const injectBeforeClosingBody = (html: string, fragment: string): string => {
  const closingBodyTagIndex = html.indexOf("</body>")

  return closingBodyTagIndex === -1
    ? `${html}${fragment}`
    : `${html.slice(0, closingBodyTagIndex)}${fragment}${html.slice(closingBodyTagIndex)}`
}

const loomExampleVitePlugin = (): Plugin => ({
  name: "effectify:loom-vite",
  transformIndexHtml(html) {
    return injectBeforeClosingBody(
      html,
      `<script type="application/json" id="${appPayloadElementId}"></script><script type="module" src="/src/entry-browser.ts"></script>`,
    )
  },
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
