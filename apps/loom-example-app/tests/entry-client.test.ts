// @vitest-environment jsdom

import { describe, expect, it } from "vitest"
import { bootstrapClient, startClientApp } from "../src/entry-client.js"
import { createServerRenderer } from "../src/entry-server.js"

const yieldToEventLoop = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe("loom example app client entry", () => {
  it("reports a missing payload while leaving the SSR shell untouched", async () => {
    document.body.innerHTML = '<div id="loom-root"><main>server shell</main></div>'
    const before = document.body.innerHTML

    const result = await bootstrapClient(document)

    expect(result.status).toBe("missing-payload")
    expect(document.body.innerHTML).toBe(before)
  })

  it("leaves the server-rendered shell alone when the page already contains SSR html", async () => {
    const renderer = createServerRenderer()
    const result = await renderer.render({
      method: "GET",
      url: "/",
      headers: {},
    })

    document.documentElement.innerHTML = result.html
    const before = document.body.innerHTML

    const bootstrap = await startClientApp(document)

    expect(bootstrap.status).toBe("missing-payload")
    expect(document.body.innerHTML).toBe(before)
  })

  it("accepts explicit bootstrap options for missing payload diagnostics", async () => {
    document.body.innerHTML = '<div id="loom-root"><main>server shell</main></div>'

    const result = await bootstrapClient(document, { payloadElementId: "loom-demo-payload" })

    expect(result.status).toBe("missing-payload")
    expect(result.diagnostics[0]?.issues[0]?.subject).toBe("loom-demo-payload")
  })

  it("mounts the counter route into an empty dev root and keeps the buttons interactive", async () => {
    document.documentElement.innerHTML = `
      <head><title>Loom Example App</title></head>
      <body>
        <div id="loom-root"></div>
        <script type="application/json" id="__loom_payload__"></script>
      </body>
    `
    window.history.replaceState({}, "", "/")

    const result = await startClientApp(document)
    const count = () => document.querySelector('[data-counter-value="true"]')?.textContent
    const normalizedCount = () => count()?.replace(/\s+/g, " ").trim()
    const dynamicValue = () => document.querySelector('[data-counter-dynamic-value="true"]')
    const click = (actionName: "decrement" | "increment" | "reset") => {
      const button = document.querySelector(`[data-counter-action="${actionName}"]`)

      if (!(button instanceof HTMLButtonElement)) {
        throw new Error(`expected ${actionName} button`)
      }

      button.click()
    }

    expect(result.status).toBe("missing-payload")
    expect(document.querySelectorAll('[data-app-shell="loom-example-app"]')).toHaveLength(1)
    expect(normalizedCount()).toBe("Count: 2")
    expect(document.body.textContent).toContain("only the numeric value flashes")

    click("increment")
    await yieldToEventLoop()
    expect(normalizedCount()).toBe("Count: 3")
    expect(dynamicValue()?.getAttribute("data-counter-debug-flash")).toBe("active")

    click("increment")
    await yieldToEventLoop()
    expect(normalizedCount()).toBe("Count: 4")

    click("decrement")
    await yieldToEventLoop()
    expect(normalizedCount()).toBe("Count: 3")

    click("decrement")
    await yieldToEventLoop()
    expect(normalizedCount()).toBe("Count: 2")

    click("reset")
    await yieldToEventLoop()
    expect(normalizedCount()).toBe("Count: 2")
    expect(document.body.textContent).toContain("mount(...)")
    expect(document.title).toBe("Loom Example App · Counter")
  })

  it("handles delegated clicks that originate from button text nodes in the dev fallback", async () => {
    document.documentElement.innerHTML = `
      <head><title>Loom Example App</title></head>
      <body>
        <div id="loom-root"></div>
        <script type="application/json" id="__loom_payload__"></script>
      </body>
    `
    window.history.replaceState({}, "", "/")

    await startClientApp(document)

    const incrementButton = document.querySelector('[data-counter-action="increment"]')

    if (!(incrementButton instanceof HTMLButtonElement)) {
      throw new Error("expected increment button")
    }

    const labelNode = incrementButton.firstChild

    if (!(labelNode instanceof Text)) {
      throw new Error("expected increment button text node")
    }

    labelNode.dispatchEvent(new MouseEvent("click", { bubbles: true }))

    expect(document.querySelector('[data-counter-value="true"]')?.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Count: 3",
    )
  })

  it("renders a minimal not-found message for non-root dev fallback paths", async () => {
    document.documentElement.innerHTML = `
      <head><title>Loom Example App</title></head>
      <body>
        <div id="loom-root"></div>
        <script type="application/json" id="__loom_payload__"></script>
      </body>
    `
    window.history.replaceState({}, "", "/missing")

    const result = await startClientApp(document)

    expect(result.status).toBe("missing-payload")
    expect(document.body.textContent).toContain("Route not found")
    expect(document.body.textContent).toContain("Requested path: /missing")
  })
})
