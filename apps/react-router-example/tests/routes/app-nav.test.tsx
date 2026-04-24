import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"

vi.mock("../../app/lib/auth-client.js", () => ({
  authClient: {
    signOut: vi.fn(),
  },
}))

const { AppNav, NAV_ITEMS } = await import("../../app/app-nav.js")

describe("AppNav", () => {
  it("defines a stable top-level navigation contract", () => {
    expect(NAV_ITEMS).toEqual([
      { to: "/", label: "Home" },
      { to: "/login", label: "Login" },
      { to: "/signup", label: "Sign Up" },
      { to: "/todo-app", label: "Todo App" },
      { to: "/chat", label: "Chat Demo" },
      { to: "/hatchet-demo", label: "Hatchet Demo" },
    ])
  })

  it("opts navigation links out of render-time route discovery to keep first render deterministic", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/"]}>
        <AppNav />
      </MemoryRouter>,
    )

    for (const item of NAV_ITEMS) {
      expect(markup).toContain(`href="${item.to}"`)
      expect(markup).toContain(item.label)
    }

    expect(markup).not.toContain("data-discover")
  })
})
