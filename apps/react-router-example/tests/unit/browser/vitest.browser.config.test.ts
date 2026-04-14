import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import browserConfig, { browserTestBaseUrl } from "../../../vitest.browser.config.js"
import { defaultBrowserTestBaseUrl } from "../../browser/support/browser-test-config.js"

describe("vitest browser config", () => {
  it("isolates browser tests and points to the reusable base url", () => {
    const testConfig = browserConfig.test!

    expect(testConfig.include).toEqual(["tests/browser/**/*.browser.test.ts"])
    expect(testConfig.browser?.enabled).toBe(true)
    expect(testConfig.browser?.instances).toEqual([{ browser: "chrome" }])
    expect(browserTestBaseUrl).toBe(defaultBrowserTestBaseUrl)
    expect(browserConfig.define?.__BROWSER_TEST_BASE_URL__).toBe(
      JSON.stringify(defaultBrowserTestBaseUrl),
    )
  })

  it("includes browser test sources in tsconfig.test.json", () => {
    const tsconfig = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../../tsconfig.test.json"),
        "utf8",
      ),
    ) as {
      include: string[]
    }

    expect(tsconfig.include).toContain("./tests/**/*.ts")
  })
})
