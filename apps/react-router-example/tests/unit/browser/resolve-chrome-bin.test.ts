import { describe, expect, it } from "vitest"
import { resolveChromeBin } from "../../browser/support/resolve-chrome-bin"

describe("resolveChromeBin", () => {
  it("prefers the CHROME_BIN override when present", () => {
    const resolved = resolveChromeBin({
      env: { CHROME_BIN: "/custom/chrome" },
      pathEntries: ["/usr/bin"],
      isExecutable: () => true,
    })

    expect(resolved).toBe("/custom/chrome")
  })

  it("falls back to chromium and then google-chrome-stable from PATH", () => {
    const chromium = resolveChromeBin({
      env: {},
      pathEntries: ["/usr/bin", "/opt/google/chrome"],
      isExecutable: (candidate) => candidate === "/usr/bin/chromium",
    })

    const chrome = resolveChromeBin({
      env: {},
      pathEntries: ["/opt/google/chrome"],
      isExecutable: (candidate) => candidate === "/opt/google/chrome/google-chrome-stable",
    })

    expect(chromium).toBe("/usr/bin/chromium")
    expect(chrome).toBe("/opt/google/chrome/google-chrome-stable")
  })

  it("throws a clear error when no supported browser is available", () => {
    expect(() =>
      resolveChromeBin({
        env: {},
        pathEntries: ["/usr/bin"],
        isExecutable: () => false,
      })
    ).toThrowError(/CHROME_BIN.*chromium.*google-chrome-stable/i)
  })
})
