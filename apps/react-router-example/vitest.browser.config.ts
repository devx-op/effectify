import { webdriverio } from "@vitest/browser-webdriverio"
import { defineConfig } from "vitest/config"
import { browserCommands } from "./test/browser/browser-commands.js"
import { resolveBrowserTestBaseUrl } from "./test/browser/browser-test-config.js"
import { resolveChromeBin } from "./test/browser/resolve-chrome-bin.js"

export const browserTestBaseUrl = resolveBrowserTestBaseUrl()

export default defineConfig({
  define: {
    __BROWSER_TEST_BASE_URL__: JSON.stringify(browserTestBaseUrl),
  },
  test: {
    globals: true,
    include: ["test/browser/**/*.browser.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "app/**/*.test.ts"],
    browser: {
      enabled: true,
      commands: browserCommands,
      instances: [{ browser: "chrome" }],
      provider: webdriverio({
        capabilities: {
          "goog:chromeOptions": {
            args: [
              "--headless=new",
              "--disable-dev-shm-usage",
              "--no-sandbox",
              "--window-size=1280,960",
            ],
            binary: resolveChromeBin(),
          },
        },
      }) as never,
    },
  },
  esbuild: {
    target: "node22",
  },
})
