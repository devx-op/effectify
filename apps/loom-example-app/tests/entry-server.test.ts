import { describe, expect, it } from "vitest"
import { createServerRenderer } from "../src/entry-server.js"

describe("loom example app server entry", () => {
  it("renders the home route inside the shared document shell", async () => {
    const renderer = createServerRenderer()
    const result = await renderer.render({
      method: "GET",
      url: "/",
      headers: {},
    })

    expect(result.status).toBe(200)
    expect(result.html).toContain("Loom Example App")
    expect(result.html).toContain('id="loom-root"')
    expect(result.html).toContain('data-route-view="home"')
    expect(result.html).toContain('href="/docs/about"')
    expect(result.html).toContain('href="/live-island"')
  })

  it("renders the docs/about route from its dedicated module", async () => {
    const renderer = createServerRenderer()
    const result = await renderer.render({
      method: "GET",
      url: "/docs/about",
      headers: {},
    })

    expect(result.status).toBe(200)
    expect(result.html).toContain("About this Loom example")
    expect(result.html).toContain('data-route-view="docs-about"')
    expect(result.html).toContain("vNext authoring path first")
  })

  it("documents deferred scope explicitly on the docs/about route", async () => {
    const renderer = createServerRenderer()
    const result = await renderer.render({
      method: "GET",
      url: "/docs/about",
      headers: {},
    })

    expect(result.status).toBe(200)
    expect(result.html).toContain('data-route-view="docs-about"')
    expect(result.html).toContain("What it does not try to fake yet")
    expect(result.html).toContain("full SPA navigation")
    expect(result.html).toContain("router-owned client transitions")
    expect(result.html).toContain("production styling polish")
  })

  it("renders the live-island route with resumability payload and hydration markers", async () => {
    const renderer = createServerRenderer()
    const result = await renderer.render({
      method: "GET",
      url: "/live-island",
      headers: {},
    })

    expect(result.status).toBe(200)
    expect(result.resumability).toBeDefined()
    expect(result.html).toContain('data-route-view="live-island"')
    expect(result.html).toContain('id="__loom_payload__"')
    expect(result.html).toContain('data-loom-hydrate="visible"')
    expect(result.html).toContain('data-counter-action="increment"')
    expect(result.html).toContain('data-live-count-value="true"')
  })

  it("returns a dedicated not-found document for unknown paths", async () => {
    const renderer = createServerRenderer()
    const result = await renderer.render({
      method: "GET",
      url: "/missing-route",
      headers: {},
    })

    expect(result.status).toBe(404)
    expect(result.html).toContain("Page not found")
    expect(result.html).toContain('data-route-view="not-found"')
    expect(result.html).toContain("/missing-route")
  })
})
