import type { EntryContext } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { callbacks, renderToPipeableStream } = vi.hoisted(() => ({
  callbacks: [] as string[],
  renderToPipeableStream: vi.fn(),
}))

vi.mock("@react-router/node", () => ({
  createReadableStreamFromReadable: () =>
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("<!doctype html><main>Effectify RR8</main>"))
        controller.close()
      },
    }),
}))

vi.mock("react-dom/server", () => ({
  renderToPipeableStream,
}))

import handleRequest from "../../app/entry.server.js"

const context = (isSpaMode = false) => ({ isSpaMode }) as EntryContext

const request = (
  path = "/",
  userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
) =>
  new Request(`https://example.test${path}`, {
    headers: { "user-agent": userAgent },
  })

const installRenderer = (event: "ready" | "stream-error" | "shell-error" = "ready") => {
  const abort = vi.fn()
  const pipe = vi.fn()

  renderToPipeableStream.mockImplementation((_element, options) => {
    queueMicrotask(() => {
      if (event === "shell-error") {
        callbacks.push("onShellError")
        options.onShellError(new Error("initial shell failed"))
        return
      }
      if (event === "stream-error") {
        callbacks.push("onError")
        options.onError(new Error("stream failed"))
      }

      const ready = options.onShellReady ?? options.onAllReady
      callbacks.push(options.onShellReady ? "onShellReady" : "onAllReady")
      ready()
    })

    return { abort, pipe }
  })

  return { abort, pipe }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  callbacks.length = 0
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  renderToPipeableStream.mockReset()
})

describe("React Router 8 server entry", () => {
  it("streams browser HTML at shell readiness with the supplied status and headers", async () => {
    const { pipe } = installRenderer()
    const headers = new Headers({ "X-Route-Evidence": "browser-shell" })

    const response = await handleRequest(request(), 207, headers, context())

    expect(callbacks).toEqual(["onShellReady"])
    expect(pipe).toHaveBeenCalledOnce()
    expect(response.status).toBe(207)
    expect(response.headers.get("X-Route-Evidence")).toBe("browser-shell")
    expect(response.headers.get("Content-Type")).toBe("text/html")
    await expect(response.text()).resolves.toBe("<!doctype html><main>Effectify RR8</main>")
  })

  it.each([
    ["bot", request("/", "Googlebot/2.1"), context()],
    ["SPA mode", request(), context(true)],
  ])("waits for all content before responding to %s requests", async (_kind, incomingRequest, entryContext) => {
    installRenderer()

    const response = await handleRequest(incomingRequest, 200, new Headers(), entryContext)

    expect(callbacks).toEqual(["onAllReady"])
    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toContain("Effectify RR8")
  })

  it("returns status 500 when streaming rendering fails before readiness", async () => {
    installRenderer("stream-error")
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)

    const response = await handleRequest(request("/stream-error"), 200, new Headers(), context())

    expect(callbacks).toEqual(["onError", "onShellReady"])
    expect(response.status).toBe(500)
    expect(consoleError).not.toHaveBeenCalled()
  })

  it("rejects the exact initial shell rendering error", async () => {
    installRenderer("shell-error")
    const shellError = new Error("initial shell failed")
    renderToPipeableStream.mockImplementation((_element, options) => {
      queueMicrotask(() => {
        callbacks.push("onShellError")
        options.onShellError(shellError)
      })
      return { abort: vi.fn(), pipe: vi.fn() }
    })

    await expect(handleRequest(request("/shell-error"), 200, new Headers(), context())).rejects.toBe(shellError)
    expect(callbacks).toEqual(["onShellError"])
  })
})
