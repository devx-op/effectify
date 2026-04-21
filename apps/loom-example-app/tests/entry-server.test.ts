import { describe, expect, it } from "vitest"
import { createServerRenderer } from "../src/entry-server.js"

describe("loom example app server entry", () => {
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
