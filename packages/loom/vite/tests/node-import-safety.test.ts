import { JSDOM } from "jsdom"
import { beforeEach, describe, expect, it, vi } from "vitest"

describe("@effectify/loom-vite module loading", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("loads the Vite adapter surface without resolving @effectify/loom during module evaluation", async () => {
    vi.doMock("@effectify/loom", () => {
      throw new Error("unexpected @effectify/loom module evaluation")
    })

    const module = await import("../src/index.js")

    expect(typeof module.LoomVite.loom).toBe("function")
    expect(typeof module.LoomVite.bootstrap).toBe("function")
  })

  it("returns missing-payload without resolving @effectify/loom runtime helpers", async () => {
    vi.doMock("@effectify/loom", () => {
      throw new Error("unexpected @effectify/loom module evaluation")
    })

    const { LoomVite } = await import("../src/index.js")
    const document = new JSDOM('<html><body><div id="loom-root"></div></body></html>').window.document

    await expect(LoomVite.bootstrap(document)).resolves.toMatchObject({
      status: "missing-payload",
    })
  })
})
