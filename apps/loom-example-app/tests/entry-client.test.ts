// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest"
import { bootstrapClient, startClientApp } from "../src/entry-client.js"
import { createServerRenderer } from "../src/entry-server.js"
import { resetTodoExampleState } from "../src/router-runtime.js"

const yieldToEventLoop = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const expectElement = (value: Element | null, name: string): HTMLElement => {
  if (!(value instanceof HTMLElement)) {
    throw new Error(`expected ${name}`)
  }

  return value
}

const expectInputElement = (value: Element | null, name: string): HTMLInputElement => {
  if (!(value instanceof HTMLInputElement)) {
    throw new Error(`expected ${name}`)
  }

  return value
}

describe("loom example app client entry", () => {
  beforeEach(() => {
    resetTodoExampleState()
  })

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

    document.open()
    document.write(result.html)
    document.close()
    const before = document.body.innerHTML

    const bootstrap = await startClientApp(document)

    expect(bootstrap.status).toBe("missing-payload")
    expect(document.body.innerHTML).toBe(before)
  })

  it("uses the default server payload marker without requiring explicit bootstrap overrides", async () => {
    const renderer = createServerRenderer()
    const result = await renderer.render({
      method: "GET",
      url: "/",
      headers: {},
    })

    document.documentElement.innerHTML = result.html

    const bootstrap = await bootstrapClient(document)

    expect(result.html).toContain('id="__loom_payload__"')
    expect(bootstrap.status).toBe("missing-payload")
    expect(bootstrap.diagnostics[0]?.issues[0]?.subject).toBe("__loom_payload__")
    expect(document.body.textContent).toContain("Loom vNext counter")
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
    const reactiveCue = () => document.querySelector('[data-counter-reactive-cue="true"]')
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
    expect(document.body.textContent).toContain("Templates author this route now")

    const cueBefore = expectElement(reactiveCue(), "reactive cue")
    const dynamicValueBefore = expectElement(dynamicValue(), "dynamic counter value")

    expect(cueBefore.dataset.counterTone).toBe("baseline")
    expect(cueBefore.getAttribute("title")).toBe("Reactive cue tone: baseline (2)")

    click("increment")
    await yieldToEventLoop()
    expect(normalizedCount()).toBe("Count: 3")

    const cueAfterIncrement = expectElement(reactiveCue(), "reactive cue after increment")
    const dynamicValueAfterIncrement = expectElement(dynamicValue(), "dynamic counter value after increment")

    expect(cueAfterIncrement).toBe(cueBefore)
    expect(dynamicValueAfterIncrement).toBe(dynamicValueBefore)
    expect(cueAfterIncrement.getAttribute("data-counter-tone")).toBe("rising")
    expect(cueAfterIncrement.getAttribute("title")).toBe("Reactive cue tone: rising (3)")

    click("increment")
    await yieldToEventLoop()
    expect(normalizedCount()).toBe("Count: 4")
    expect(expectElement(reactiveCue(), "reactive cue after second increment").getAttribute("title")).toBe(
      "Reactive cue tone: rising (4)",
    )

    click("decrement")
    await yieldToEventLoop()
    expect(normalizedCount()).toBe("Count: 3")

    click("decrement")
    await yieldToEventLoop()
    expect(normalizedCount()).toBe("Count: 2")
    expect(reactiveCue()?.getAttribute("data-counter-tone")).toBe("baseline")
    expect(expectElement(reactiveCue(), "reactive cue after decrement").getAttribute("title")).toBe(
      "Reactive cue tone: baseline (2)",
    )

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

  it("mounts the todo route into the dev fallback and keeps shared atoms in sync across sections", async () => {
    document.documentElement.innerHTML = `
      <head><title>Loom Example App</title></head>
      <body>
        <div id="loom-root"></div>
        <script type="application/json" id="__loom_payload__"></script>
      </body>
    `
    window.history.replaceState({}, "", "/todos")

    const result = await startClientApp(document)
    const todoInput = () => document.querySelector('[data-todo-input="true"]')
    const addTodoButton = () => document.querySelector('[data-todo-add-action="true"]')
    const openCount = () => document.querySelector('[data-todo-open-count="true"]')?.textContent?.trim()
    const completedCount = () => document.querySelector('[data-todo-completed-count="true"]')?.textContent?.trim()
    const sessionCount = () => document.querySelector('[data-todo-session-count="true"]')?.textContent?.trim()
    const clickButton = (selector: string) => {
      const button = document.querySelector(selector)

      if (!(button instanceof HTMLButtonElement)) {
        throw new Error(`expected button for ${selector}`)
      }

      button.click()
    }

    expect(result.status).toBe("missing-payload")
    expect(document.querySelector('[data-route-view="todo"]')).not.toBeNull()
    expect(openCount()).toBe("2")
    expect(completedCount()).toBe("1")
    expect(sessionCount()).toBe("Added from this mounted composer: 0")

    const input = expectInputElement(todoInput(), "todo input")
    input.focus()
    input.value = "Document the slot tradeoffs"
    input.dispatchEvent(new Event("input", { bubbles: true }))
    await yieldToEventLoop()

    expect(expectInputElement(todoInput(), "todo input after typing")).toBe(input)
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe("Document the slot tradeoffs")

    const addButton = expectElement(addTodoButton(), "add todo button")

    addButton.click()
    await yieldToEventLoop()

    expect(openCount()).toBe("3")
    expect(sessionCount()).toBe("Added from this mounted composer: 1")
    expect(expectInputElement(todoInput(), "todo input after add").value).toBe("")
    expect(document.querySelector('[data-todo-item-id="4"]')?.textContent).toContain("Document the slot tradeoffs")

    clickButton('[data-todo-toggle-id="2"]')
    await yieldToEventLoop()
    expect(openCount()).toBe("2")
    expect(completedCount()).toBe("2")

    clickButton('[data-todo-remove-id="1"]')
    await yieldToEventLoop()
    expect(openCount()).toBe("2")
    expect(completedCount()).toBe("1")
    expect(document.querySelector('[data-todo-item-id="1"]')).toBeNull()

    clickButton('[data-todo-clear-completed="true"]')
    await yieldToEventLoop()
    expect(openCount()).toBe("2")
    expect(completedCount()).toBe("0")
    expect(document.querySelector('[data-todo-item-id="2"]')).toBeNull()
    expect(document.title).toBe("Loom Example App · Todo app")
  })

  it("submits the composer from the Enter key and preserves the same runtime behavior as the Add button", async () => {
    document.documentElement.innerHTML = `
      <head><title>Loom Example App</title></head>
      <body>
        <div id="loom-root"></div>
        <script type="application/json" id="__loom_payload__"></script>
      </body>
    `
    window.history.replaceState({}, "", "/todos")

    await startClientApp(document)

    const input = expectInputElement(document.querySelector('[data-todo-input="true"]'), "todo input")
    const form = document.querySelector("form")

    if (!(form instanceof HTMLFormElement)) {
      throw new Error("expected todo composer form")
    }

    input.focus()
    input.value = "Ship Enter-key parity"
    input.dispatchEvent(new Event("input", { bubbles: true }))
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    await yieldToEventLoop()

    expect(document.querySelector('[data-todo-open-count="true"]')?.textContent?.trim()).toBe("3")
    expect(document.querySelector('[data-todo-session-count="true"]')?.textContent?.trim()).toBe(
      "Added from this mounted composer: 1",
    )
    expect(expectInputElement(document.querySelector('[data-todo-input="true"]'), "todo input after enter").value).toBe(
      "",
    )
    expect(document.querySelector('[data-todo-item-id="4"]')?.textContent).toContain("Ship Enter-key parity")
    expect(document.querySelector('[data-todo-action-status="true"]')?.textContent?.trim()).toBe("success")
  })

  it("shows invalid action feedback when the template-authored submit path fails validation", async () => {
    document.documentElement.innerHTML = `
      <head><title>Loom Example App</title></head>
      <body>
        <div id="loom-root"></div>
        <script type="application/json" id="__loom_payload__"></script>
      </body>
    `
    window.history.replaceState({}, "", "/todos")

    await startClientApp(document)

    const form = document.querySelector("form")

    if (!(form instanceof HTMLFormElement)) {
      throw new Error("expected todo composer form")
    }

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    await yieldToEventLoop()

    expect(document.querySelector('[data-todo-feedback="true"]')?.textContent).toContain("length of at least 1")
    expect(document.querySelector('[data-todo-open-count="true"]')?.textContent?.trim()).toBe("2")
    expect(document.querySelector('[data-todo-action-status="true"]')?.textContent?.trim()).toBe("invalid-input")
  })
})
