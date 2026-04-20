// @vitest-environment jsdom

import { describe, expect, it } from "vitest"
import { bootstrapClient, startClientApp } from "../src/entry-client.js"
import { createServerRenderer } from "../src/entry-server.js"

describe("loom example app client entry", () => {
  const settle = async (): Promise<void> => {
    await Promise.resolve()
  }

  it("reports a missing payload while leaving the SSR shell untouched", async () => {
    document.body.innerHTML = '<div id="loom-root"><main>server shell</main></div>'
    const before = document.body.innerHTML

    const result = await bootstrapClient(document)

    expect(result.status).toBe("missing-payload")
    expect(document.body.innerHTML).toBe(before)
  })

  it("resumes the live-island route and wires counter interactions through the local registry", async () => {
    const renderer = createServerRenderer()
    const result = await renderer.render({
      method: "GET",
      url: "/live-island",
      headers: {},
    })

    document.documentElement.innerHTML = result.html

    const bootstrap = await bootstrapClient(document)
    const readCount = () => document.querySelector('[data-live-count-value="true"]')?.textContent
    const incrementButton = document.querySelector('[data-counter-action="increment"]')
    const decrementButton = document.querySelector('[data-counter-action="decrement"]')
    const resetButton = document.querySelector('[data-counter-action="reset"]')

    expect(bootstrap.status).toBe("resumed")
    expect(bootstrap.activation?.issues).toEqual([])
    expect(readCount()).toBe("2")

    if (!(incrementButton instanceof HTMLButtonElement)) {
      throw new Error("expected increment button")
    }

    if (!(decrementButton instanceof HTMLButtonElement)) {
      throw new Error("expected decrement button")
    }

    if (!(resetButton instanceof HTMLButtonElement)) {
      throw new Error("expected reset button")
    }

    incrementButton.click()
    await settle()
    expect(readCount()).toBe("3")

    decrementButton.click()
    await settle()
    expect(readCount()).toBe("2")

    incrementButton.click()
    await settle()
    expect(readCount()).toBe("3")

    resetButton.click()
    await settle()
    expect(readCount()).toBe("2")
  })

  it("keeps the static SSR shell untouched after successful hydration", async () => {
    const renderer = createServerRenderer()
    const result = await renderer.render({
      method: "GET",
      url: "/live-island",
      headers: {},
    })

    document.documentElement.innerHTML = result.html

    const readOuterHtml = (selector: string): string => {
      const element = document.querySelector(selector)

      if (element === null) {
        throw new Error(`expected element for selector: ${selector}`)
      }

      return element.outerHTML
    }

    const staticHeaderBefore = readOuterHtml('[data-app-shell="loom-example-app"] > header')
    const staticIntroBefore = readOuterHtml('[data-route-view="live-island"] > p')
    const staticFooterBefore = readOuterHtml('[data-app-shell="loom-example-app"] > footer')

    const bootstrap = await bootstrapClient(document)
    const incrementButton = document.querySelector('[data-counter-action="increment"]')

    expect(bootstrap.status).toBe("resumed")
    expect(readOuterHtml('[data-app-shell="loom-example-app"] > header')).toBe(staticHeaderBefore)
    expect(readOuterHtml('[data-route-view="live-island"] > p')).toBe(staticIntroBefore)
    expect(readOuterHtml('[data-app-shell="loom-example-app"] > footer')).toBe(staticFooterBefore)

    if (!(incrementButton instanceof HTMLButtonElement)) {
      throw new Error("expected increment button")
    }

    incrementButton.click()

    expect(readOuterHtml('[data-app-shell="loom-example-app"] > header')).toBe(staticHeaderBefore)
    expect(readOuterHtml('[data-route-view="live-island"] > p')).toBe(staticIntroBefore)
    expect(readOuterHtml('[data-app-shell="loom-example-app"] > footer')).toBe(staticFooterBefore)
  })

  it("accepts explicit bootstrap options for missing payload diagnostics", async () => {
    document.body.innerHTML = '<div id="loom-root"><main>server shell</main></div>'

    const result = await bootstrapClient(document, { payloadElementId: "loom-demo-payload" })

    expect(result.status).toBe("missing-payload")
    expect(result.diagnostics[0]?.issues[0]?.subject).toBe("loom-demo-payload")
  })

  it("renders the current route into an empty dev root when no payload exists", async () => {
    document.documentElement.innerHTML = `
      <head><title>Loom Example App</title></head>
      <body>
        <div id="loom-root"></div>
        <script type="application/json" id="__loom_payload__"></script>
      </body>
    `
    window.history.replaceState({}, "", "/docs/about")

    const result = await startClientApp(document)

    expect(result.status).toBe("missing-payload")
    expect(document.querySelector('[data-app-shell="loom-example-app"]')).not.toBeNull()
    expect(document.body.textContent).toContain("About this Loom example")
    expect(document.body.textContent).toContain("What it does not try to fake yet")
    expect(document.title).toBe("Loom Example App · Docs / About")
  })

  it("does not double-wrap the app shell when the home route is rendered through the dev fallback", async () => {
    document.documentElement.innerHTML = `
      <head><title>Loom Example App</title></head>
      <body>
        <div id="loom-root"></div>
        <script type="application/json" id="__loom_payload__"></script>
      </body>
    `
    window.history.replaceState({}, "", "/")

    const result = await startClientApp(document)

    expect(result.status).toBe("missing-payload")
    expect(document.querySelectorAll('[data-app-shell="loom-example-app"]')).toHaveLength(1)
    expect(document.querySelector('[data-app-main="true"] [data-app-shell="loom-example-app"]')).toBeNull()
  })

  it("wires the live-island controls through the dev fallback when no SSR payload exists", async () => {
    document.documentElement.innerHTML = `
      <head><title>Loom Example App</title></head>
      <body>
        <div id="loom-root"></div>
        <script type="application/json" id="__loom_payload__"></script>
      </body>
    `
    window.history.replaceState({}, "", "/live-island")

    const result = await startClientApp(document)
    const readCount = () => document.querySelector('[data-live-count-value="true"]')?.textContent
    const incrementButton = document.querySelector('[data-counter-action="increment"]')
    const decrementButton = document.querySelector('[data-counter-action="decrement"]')
    const resetButton = document.querySelector('[data-counter-action="reset"]')

    expect(result.status).toBe("missing-payload")
    expect(readCount()).toBe("2")

    if (!(incrementButton instanceof HTMLButtonElement)) {
      throw new Error("expected increment button")
    }

    if (!(decrementButton instanceof HTMLButtonElement)) {
      throw new Error("expected decrement button")
    }

    if (!(resetButton instanceof HTMLButtonElement)) {
      throw new Error("expected reset button")
    }

    incrementButton.click()
    await settle()
    expect(readCount()).toBe("3")

    decrementButton.click()
    await settle()
    expect(readCount()).toBe("2")

    incrementButton.click()
    await settle()
    expect(readCount()).toBe("3")

    resetButton.click()
    await settle()
    expect(readCount()).toBe("2")
  })
})
