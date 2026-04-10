import { describe, expect, it } from "vitest"
import { defaultBrowserTestBaseUrl, resolveBrowserTestBaseUrl } from "./browser-test-config.js"

describe("browser test base url", () => {
  it("defaults to the fixed loopback browser test url", () => {
    expect(resolveBrowserTestBaseUrl({})).toBe(defaultBrowserTestBaseUrl)
  })

  it("prefers the BROWSER_TEST_BASE_URL override when present", () => {
    expect(
      resolveBrowserTestBaseUrl({
        BROWSER_TEST_BASE_URL: "http://127.0.0.1:3200",
      }),
    ).toBe("http://127.0.0.1:3200")
  })
})
