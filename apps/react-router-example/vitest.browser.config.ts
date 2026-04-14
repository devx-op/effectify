import { webdriverio } from "@vitest/browser-webdriverio"
import { defineConfig } from "vitest/config"
import { browserCommands } from "./tests/browser/support/browser-commands.js"
import { resolveBrowserTestBaseUrl } from "./tests/browser/support/browser-test-config.js"
import { resolveChromeBin } from "./tests/browser/support/resolve-chrome-bin.js"

export const browserTestBaseUrl = resolveBrowserTestBaseUrl()

export default defineConfig({
  define: {
    __BROWSER_TEST_BASE_URL__: JSON.stringify(browserTestBaseUrl),
  },
  test: {
    globals: true,
    include: ["tests/browser/**/*.browser.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/unit/browser/**"],
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
