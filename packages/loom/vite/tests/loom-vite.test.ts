import { describe, expect, it, vi } from "vitest"
import {
  defaultLoomBuildId,
  defaultLoomClientEntry,
  defaultLoomPayloadElementId,
  defaultLoomRootId,
  normalizeLoomViteOptions,
  resolveLoomViteState,
} from "../src/internal/plugin-state.js"
import { logLoomDevDiagnostics, transformLoomIndexHtml } from "../src/internal/html-transform.js"
import { bootstrap, loom } from "../src/loom-vite.js"

describe("@effectify/loom-vite", () => {
  it("normalizes default bootstrap options for the zero-config Loom path", () => {
    expect(normalizeLoomViteOptions({})).toEqual({
      buildId: defaultLoomBuildId,
      clientEntry: defaultLoomClientEntry,
      payloadElementId: defaultLoomPayloadElementId,
      rootId: defaultLoomRootId,
    })
  })

  it("injects the default root container, client entry, and payload marker for Loom html", () => {
    const state = resolveLoomViteState({ root: "/workspace" }, {
      clientEntry: "/src/entry-client.ts",
      payloadElementId: "loom-payload",
      rootId: "custom-root",
    })

    expect(transformLoomIndexHtml("<html><body><main>ready</main></body></html>", state)).toBe(
      '<html><body><main>ready</main><div id="custom-root"></div><script type="application/json" id="loom-payload" data-loom-payload="custom-root"></script><script type="module" src="/src/entry-client.ts"></script></body></html>',
    )
  })

  it("preserves an existing root container instead of duplicating it", () => {
    const state = resolveLoomViteState({ root: "/workspace" }, {})
    const html = '<html><body><div id="loom-root"><main>static</main></div></body></html>'

    expect(transformLoomIndexHtml(html, state)).toContain('<div id="loom-root"><main>static</main></div>')
    expect(transformLoomIndexHtml(html, state).match(/id="loom-root"/g)).toHaveLength(1)
  })

  it("emits dev diagnostics only for enabled Loom state", () => {
    const info = vi.fn()
    const enabled = resolveLoomViteState({ root: "/workspace" }, {})
    const aliased = resolveLoomViteState({ root: "/workspace" }, { root: "legacy-root" })

    logLoomDevDiagnostics(info, enabled)
    logLoomDevDiagnostics(info, aliased)

    expect(info).toHaveBeenCalledTimes(2)
    expect(JSON.parse(info.mock.calls[0]?.[0] ?? "{}")).toEqual({
      scope: "loom",
      report: {
        phase: "adapter",
        counts: {
          info: 1,
          warn: 0,
          error: 0,
          fatal: 0,
        },
        highestSeverity: "info",
        issues: [
          {
            phase: "adapter",
            severity: "info",
            code: "loom.adapter.vite.enabled",
            message: "Loom Vite is enabled for the configured browser entry.",
            subject: "loom-root",
            details: {
              buildId: "loom-dev",
              clientEntry: "/src/entry-client.ts",
              payloadElementId: "__loom_payload__",
              rootId: "loom-root",
            },
          },
        ],
      },
      summary: {
        phase: "adapter",
        total: 1,
        highestSeverity: "info",
        hasErrors: false,
      },
    })
  })

  it("runs the Vite hook callbacks end to end for a Loom-owned project", () => {
    const plugin = loom({
      clientEntry: "/src/entry-client.ts",
      payloadElementId: "loom-payload",
      rootId: "custom-root",
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

    expect(transformed).toContain('id="custom-root"')
    expect(transformed).toContain('id="loom-payload"')
    expect(JSON.parse(info.mock.calls[0]?.[0] ?? "{}")).toEqual({
      scope: "loom",
      report: {
        phase: "adapter",
        counts: {
          info: 1,
          warn: 0,
          error: 0,
          fatal: 0,
        },
        highestSeverity: "info",
        issues: [
          {
            phase: "adapter",
            severity: "info",
            code: "loom.adapter.vite.enabled",
            message: "Loom Vite is enabled for the configured browser entry.",
            subject: "custom-root",
            details: {
              buildId: "loom-dev",
              clientEntry: "/src/entry-client.ts",
              payloadElementId: "loom-payload",
              rootId: "custom-root",
            },
          },
        ],
      },
      summary: {
        phase: "adapter",
        total: 1,
        highestSeverity: "info",
        hasErrors: false,
      },
    })
  })

  it("rejects unsupported renderer options at the Vite adapter boundary", () => {
    const invalidOptions = { rootId: "loom-root", renderer: "native" }

    expect(() => Reflect.apply(loom, undefined, [invalidOptions])).toThrow(
      "Loom Vite only supports the web renderer in this slice",
    )
  })

  it("exposes the initial Vite plugin hook surface", () => {
    const plugin = loom()

    expect(typeof bootstrap).toBe("function")
    expect(plugin.name).toBe("effectify:loom-vite")
    expect(typeof plugin.configResolved).toBe("function")
    expect(typeof plugin.transformIndexHtml).toBe("function")
    expect(typeof plugin.configureServer).toBe("function")
  })
})
