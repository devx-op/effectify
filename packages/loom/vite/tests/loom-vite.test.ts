import { describe, expect, it, vi } from "vitest"
import {
  defaultLoomClientEntry,
  defaultLoomPayloadElementId,
  normalizeLoomViteOptions,
  resolveLoomViteState,
} from "../src/internal/plugin-state.js"
import { logLoomDevDiagnostics, transformLoomIndexHtml } from "../src/internal/html-transform.js"
import { bootstrap, loom } from "../src/loom-vite.js"

describe("@effectify/loom-vite", () => {
  it("normalizes options without enabling Loom for unrelated projects", () => {
    expect(normalizeLoomViteOptions({})).toEqual({
      root: undefined,
      clientEntry: defaultLoomClientEntry,
      payloadElementId: defaultLoomPayloadElementId,
    })
  })

  it("injects a client entry and payload marker for Loom-owned html", () => {
    const state = resolveLoomViteState({ root: "/workspace" }, {
      root: "src/app.ts",
      clientEntry: "/src/entry-client.ts",
      payloadElementId: "loom-payload",
    })

    expect(transformLoomIndexHtml("<html><body><main>ready</main></body></html>", state)).toBe(
      '<html><body><main>ready</main><script type="module" src="/src/entry-client.ts" data-loom-client-entry="src/app.ts"></script><script type="application/json" id="loom-payload" data-loom-payload="src/app.ts"></script></body></html>',
    )
  })

  it("preserves unrelated html when no Loom root is configured", () => {
    const state = resolveLoomViteState({ root: "/workspace" }, {})
    const html = "<html><body><main>static</main></body></html>"

    expect(transformLoomIndexHtml(html, state)).toBe(html)
  })

  it("emits dev diagnostics only for enabled Loom state", () => {
    const info = vi.fn()
    const enabled = resolveLoomViteState({ root: "/workspace" }, { root: "src/app.ts" })
    const disabled = resolveLoomViteState({ root: "/workspace" }, {})

    logLoomDevDiagnostics(info, enabled)
    logLoomDevDiagnostics(info, disabled)

    expect(info).toHaveBeenCalledTimes(1)
    expect(info).toHaveBeenCalledWith(
      "[loom] enabled root=src/app.ts client=/src/loom-client.ts payload=__loom_payload__",
    )
  })

  it("runs the Vite hook callbacks end to end for a Loom-owned project", () => {
    const plugin = loom({
      root: "src/app.ts",
      clientEntry: "/src/entry-client.ts",
      payloadElementId: "loom-payload",
    })
    const info = vi.fn()
    const configResolved = typeof plugin.configResolved === "function"
      ? plugin.configResolved
      : plugin.configResolved?.handler
    const transformIndexHtml = typeof plugin.transformIndexHtml === "function"
      ? plugin.transformIndexHtml
      : plugin.transformIndexHtml?.handler
    const configureServer = typeof plugin.configureServer === "function"
      ? plugin.configureServer
      : plugin.configureServer?.handler

    if (configResolved === undefined || transformIndexHtml === undefined || configureServer === undefined) {
      throw new Error("expected Loom plugin hooks")
    }

    Reflect.apply(configResolved, plugin, [{ root: "/workspace" }])

    const transformed = Reflect.apply(transformIndexHtml, plugin, [
      "<html><body><main>ready</main></body></html>",
    ])

    Reflect.apply(configureServer, plugin, [
      {
        config: {
          logger: {
            info,
          },
        },
      },
    ])

    expect(transformed).toContain('data-loom-client-entry="src/app.ts"')
    expect(transformed).toContain('id="loom-payload"')
    expect(info).toHaveBeenCalledWith("[loom] enabled root=src/app.ts client=/src/entry-client.ts payload=loom-payload")
  })

  it("rejects unsupported renderer options at the Vite adapter boundary", () => {
    const invalidOptions = { root: "src/app.ts", renderer: "native" }

    expect(() => Reflect.apply(loom, undefined, [invalidOptions])).toThrow(
      "Loom Vite only supports the web renderer in this slice",
    )
  })

  it("exposes the initial Vite plugin hook surface", () => {
    const plugin = loom({ root: "src/app.ts" })

    expect(typeof bootstrap).toBe("function")
    expect(plugin.name).toBe("effectify:loom-vite")
    expect(typeof plugin.configResolved).toBe("function")
    expect(typeof plugin.transformIndexHtml).toBe("function")
    expect(typeof plugin.configureServer).toBe("function")
  })
})
