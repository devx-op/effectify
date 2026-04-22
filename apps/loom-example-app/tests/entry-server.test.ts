import { beforeEach, describe, expect, it } from "vitest"
import { createServerRenderer } from "../src/entry-server.js"
import { resetTodoExampleState } from "../src/router-runtime.js"

describe("loom example app server entry", () => {
  beforeEach(() => {
    resetTodoExampleState()
  })

  it("renders the single counter route inside the shared document shell", async () => {
    const renderer = createServerRenderer()
    const result = await renderer.render({
      method: "GET",
      url: "/",
      headers: {},
    })

    expect(result.status).toBe(200)
    expect(result.html).toContain("Loom vNext counter")
    expect(result.html).toContain('id="loom-root"')
    expect(result.html).toContain('data-route-view="counter"')
    expect(result.html).toContain('id="__loom_payload__"')
    expect(result.html).toContain('data-counter-action="increment"')
    expect(result.html).toContain('data-counter-value="true"')
    expect(result.html).toContain('data-counter-dynamic-value="true"')
    expect(result.html).toContain('data-counter-reactive-cue="true"')
    expect(result.html).toContain("Loom-native attr/class/style bindings")
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
    expect(result.html).toContain("Loom vNext todo app")
    expect(result.html).toContain('data-route-view="todo"')
    expect(result.html).toContain('data-todo-input="true"')
    expect(result.html).toContain('data-todo-add-action="true"')
    expect(result.html).toContain('data-todo-list="true"')
    expect(result.html).toContain('data-todo-session-count="true"')
    expect(result.html).toContain('value=""')
    expect(result.html).toContain("Sketch the shared Atom shape")
    expect(result.html).toContain("durable todo state now comes from loader/action runtime boundaries")
  })

  it("returns a minimal not-found document for unknown paths", async () => {
    const renderer = createServerRenderer()
    const result = await renderer.render({
      method: "GET",
      url: "/missing-route",
      headers: {},
    })

    expect(result.status).toBe(404)
    expect(result.html).toContain("Route not found")
    expect(result.html).toContain('data-route-view="not-found"')
    expect(result.html).toContain("/missing-route")
  })
})
