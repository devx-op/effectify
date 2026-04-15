import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import App from "../../app/app.js"
import routes from "../../app/routes.js"

describe("react-router example app shell", () => {
  it("renders a meaningful landing page for the example app", () => {
    const markup = renderToStaticMarkup(<App />)

    expect(markup).toContain("React Router + Effect examples")
    expect(markup).toContain("Authentication")
    expect(markup).toContain("Todo workflow")
    expect(markup).toContain("Chat demo")
    expect(markup).not.toContain("hola mundo")
  })

  it("keeps route config aligned with navigation and auth entrypoints", () => {
    const routeEntries = JSON.stringify(routes)

    for (const path of ["login", "signup", "todo-app", "chat"]) {
      expect(routeEntries).toContain(`"path":"${path}"`)
    }

    expect(routeEntries).toContain("api/auth/*")
  })
})
