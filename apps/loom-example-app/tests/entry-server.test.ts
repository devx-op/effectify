import { beforeEach, describe, expect, it } from "vitest"
import { createServerRenderer } from "../src/entry-server.js"
import { resetTodoExampleState } from "../src/router-runtime.js"

describe("loom example app server entry", () => {
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, "document")
    resetTodoExampleState()
  })

  it("renders without requiring or mutating a global document", async () => {
    expect(Reflect.has(globalThis, "document")).toBe(false)

    const renderer = createServerRenderer()
    const result = await renderer.render({
      method: "GET",
      url: "/",
      headers: {},
    })

    expect(result.status).toBe(200)
    expect(result.html).toContain('data-route-view="counter"')
    expect(Reflect.has(globalThis, "document")).toBe(false)
  })

  it("renders the single counter route inside the shared document shell", async () => {
    const renderer = createServerRenderer()
    const result = await renderer.render({
      method: "GET",
      url: "/",
      headers: {},
    })

    expect(result.status).toBe(200)
    expect(result.html).toContain("<title>Loom Example App · Counter</title>")
    expect(result.html).toContain("Loom vNext counter")
    expect(result.html).toContain('id="loom-root"')
    expect(result.html).toContain('data-route-view="counter"')
    expect(result.html).toContain('id="__loom_payload__"')
    expect(result.html).toContain('data-counter-action="increment"')
    expect(result.html).toContain('data-counter-value="true"')
    expect(result.html).toContain('data-counter-dynamic-value="true"')
    expect(result.html).toContain('data-counter-reactive-cue="true"')
    expect(result.html).toContain("Templates author this route now")
    expect(result.html).toContain("mount(...) to fill the empty root")
  })

  it("renders the todo route with shared-state sections and interactive controls", async () => {
    const renderer = createServerRenderer()
    const result = await renderer.render({
      method: "GET",
      url: "/todos",
      headers: {},
    })

    expect(result.status).toBe(200)
    expect(result.html).toContain("<title>Loom Example App · Todo app</title>")
    expect(result.html).toContain("Loom vNext todo app")
    expect(result.html).toContain('data-route-view="todo"')
    expect(result.html).toContain('data-todo-input="true"')
    expect(result.html).toContain('data-todo-add-action="true"')
    expect(result.html).toContain('data-todo-list="true"')
    expect(result.html).toContain('data-todo-session-count="true"')
    expect(result.html).toContain('value=""')
    expect(result.html).toContain("<form")
    expect(result.html).toContain('name="title"')
    expect(result.html).toContain("Sketch the shared Atom shape")
    expect(result.html).toContain("authored with Loom templates plus View.of and View.use composition")
    expect(result.html).toContain("template-authored form")
  })

  it("returns a minimal not-found document for unknown paths", async () => {
    const renderer = createServerRenderer()
    const result = await renderer.render({
      method: "GET",
      url: "/missing-route",
      headers: {},
    })

    expect(result.status).toBe(404)
    expect(result.html).toContain("<title>Loom Example App · Not Found</title>")
    expect(result.html).toContain("Route not found")
    expect(result.html).toContain('data-route-view="not-found"')
    expect(result.html).toContain("/missing-route")
  })
})
