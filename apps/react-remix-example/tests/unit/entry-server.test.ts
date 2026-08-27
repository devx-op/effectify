import type { EntryContext } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

const { callbacks, renderToPipeableStream } = vi.hoisted(() => ({
  callbacks: [] as string[],
  renderToPipeableStream: vi.fn(),
}))

vi.mock("@react-router/node", () => ({
  createReadableStreamFromReadable: () =>
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("<!doctype html><main>Effectify RR7</main>"))
        controller.close()
      },
    }),
}))

vi.mock("@remix-run/node", () => ({
  createReadableStreamFromReadable: () =>
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("<!doctype html><main>Effectify RR7</main>"))
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
  new Request(`https://example.com${path}`, {
    headers: { "user-agent": userAgent },
  })

const installRenderer = () => {
  renderToPipeableStream.mockImplementation((element, options) => {
    const url = String(element.props.url)
    queueMicrotask(() => {
      if (url.endsWith("/shell-error")) {
        callbacks.push("onShellError")
        options.onShellError(new Error("shell failed"))
        return
      }
      if (url.endsWith("/stream-error")) {
        callbacks.push("onError")
        options.onError(new Error("stream failed"))
      }
      const ready = options.onShellReady ?? options.onAllReady
      const name = options.onShellReady ? "onShellReady" : "onAllReady"
      callbacks.push(name)
      ready()
    })
    return {
      abort: vi.fn(),
      pipe: vi.fn(),
    }
  })
}

afterEach(() => {
  callbacks.length = 0
  vi.restoreAllMocks()
  renderToPipeableStream.mockReset()
})

describe("React Router 7 server entry", () => {
  it("streams browser HTML at shell readiness with status and headers", async () => {
    installRenderer()
    const headers = new Headers({ "x-route": "browser" })

    const response = await handleRequest(request(), 202, headers, context())

    expect(callbacks).toEqual(["onShellReady"])
    expect(response.status).toBe(202)
    expect(response.headers.get("x-route")).toBe("browser")
    expect(response.headers.get("content-type")).toBe("text/html")
    await expect(response.text()).resolves.toContain("Effectify RR7")
  })

  it.each([
    ["bot", request("/", "Googlebot/2.1"), context()],
    ["SPA mode", request(), context(true)],
  ])("waits for all content for %s", async (_name, incomingRequest, entryContext) => {
    installRenderer()

    const response = await handleRequest(incomingRequest, 200, new Headers(), entryContext)

    expect(callbacks).toEqual(["onAllReady"])
    await expect(response.text()).resolves.toContain("Effectify RR7")
  })

  it("uses status 500 when rendering fails before the shell is ready", async () => {
    installRenderer()
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)

    const response = await handleRequest(request("/stream-error"), 200, new Headers(), context())

    expect(callbacks).toEqual(["onError", "onShellReady"])
    expect(response.status).toBe(500)
    expect(error).not.toHaveBeenCalled()
  })

  it("rejects an initial shell rendering failure", async () => {
    installRenderer()

    await expect(handleRequest(request("/shell-error"), 200, new Headers(), context())).rejects.toThrow("shell failed")
    expect(callbacks).toEqual(["onShellError"])
  })
})
