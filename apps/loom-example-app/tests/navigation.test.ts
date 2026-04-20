import { describe, expect, it } from "vitest"
import { Navigation } from "@effectify/loom-router"
import { goToDocsAbout, goToLiveIsland, hrefToDocsAbout, hrefToHome, hrefToLiveIsland } from "../src/navigation.js"

describe("loom example app navigation seam", () => {
  it("builds typed hrefs for the known routes", () => {
    expect(hrefToHome()).toBe("/")
    expect(hrefToDocsAbout()).toBe("/docs/about")
    expect(hrefToLiveIsland()).toBe("/live-island")
  })

  it("navigates through the docs helper without raw strings at the call site", () => {
    const navigation = Navigation.memory("https://effectify.dev/")

    goToDocsAbout(navigation)

    expect(navigation.current().pathname).toBe("/docs/about")
  })

  it("navigates through the typed helper without raw strings at the call site", () => {
    const navigation = Navigation.memory("https://effectify.dev/")

    goToLiveIsland(navigation)

    expect(navigation.current().pathname).toBe("/live-island")
  })
})
