import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter, RouterContextProvider } from "react-router"
import { describe, expect, it, vi } from "vitest"

vi.mock("../../app/lib/runtime.route.js", async () => {
  const { Runtime } = await import("@effectify/react-router")
  const Layer = await import("effect/Layer")

  return Runtime.make(Layer.empty)
})

import { NAV_ITEMS } from "../../app/app-nav.js"
import routes from "../../app/routes.js"
import { action, DemoScreen, loader } from "../../app/routes/demo.js"

const routeUrl = (search = "") => new URL(`http://localhost/demo${search}`)

const loaderArgs = (search = ""): LoaderFunctionArgs => {
  const url = routeUrl(search)
  return {
    context: new RouterContextProvider(),
    params: {},
    pattern: "/demo",
    request: new Request(url),
    url,
  }
}

const actionArgs = (outcome: string): ActionFunctionArgs => {
  const url = routeUrl()
  return {
    context: new RouterContextProvider(),
    params: {},
    pattern: "/demo",
    request: new Request(url, {
      method: "POST",
      body: new URLSearchParams({ outcome }),
    }),
    url,
  }
}

const expectResponse = (value: unknown): Response => {
  expect(value).toBeInstanceOf(Response)
  if (!(value instanceof Response)) throw new Error("expected Response")
  return value
}

describe("/demo helper outcomes", () => {
  it("returns and renders the loader success outcome", async () => {
    const result = await loader(loaderArgs())

    expect(result).toEqual({
      ok: true,
      data: {
        message: "Loader helper completed successfully.",
        outcome: "success",
      },
    })

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <DemoScreen loaderData={result.data} />
      </MemoryRouter>,
    )
    expect(markup).toContain("Loader helper completed successfully.")
    expect(markup).toContain("Loader outcome: success")
  })

  it("models the loader failure as a visible status and payload", async () => {
    const response = expectResponse(await loader(loaderArgs("?outcome=failure")).catch((error) => error))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      ok: false,
      errors: ["Loader helper modeled failure."],
    })
  })

  it("preserves the deliberate loader redirect status and location", async () => {
    const response = expectResponse(await loader(loaderArgs("?outcome=redirect")))

    expect(response.status).toBe(307)
    expect(response.headers.get("Location")).toBe("/demo?outcome=success")
  })

  it("returns and renders the action success outcome", async () => {
    const result = await action(actionArgs("success"))

    expect(result).toEqual({
      ok: true,
      response: {
        message: "Action helper completed successfully.",
        outcome: "success",
      },
    })

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <DemoScreen
          loaderData={{
            message: "Loader helper completed successfully.",
            outcome: "success",
          }}
          actionData={result.response}
        />
      </MemoryRouter>,
    )
    expect(markup).toContain("Action helper completed successfully.")
    expect(markup).toContain("Action outcome: success")
  })

  it("models the action failure as visible feedback", async () => {
    const response = expectResponse(await action(actionArgs("failure")))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      ok: false,
      errors: ["Action helper modeled failure."],
    })
  })

  it("preserves the deliberate action redirect status and location", async () => {
    const response = expectResponse(await action(actionArgs("redirect")))

    expect(response.status).toBe(303)
    expect(response.headers.get("Location")).toBe("/demo?outcome=success")
  })

  it("defaults an unrecognized loader outcome to the success demonstration", async () => {
    await expect(loader(loaderArgs("?outcome=unknown"))).resolves.toEqual({
      ok: true,
      data: {
        message: "Loader helper completed successfully.",
        outcome: "success",
      },
    })
  })

  it("defaults an unrecognized action outcome to the success demonstration", async () => {
    await expect(action(actionArgs("unknown"))).resolves.toEqual({
      ok: true,
      response: {
        message: "Action helper completed successfully.",
        outcome: "success",
      },
    })
  })

  it("wires the coherent demo screen into routes, navigation, and all controls", () => {
    expect(JSON.stringify(routes)).toContain('"path":"demo"')
    expect(NAV_ITEMS).toContainEqual({ to: "/demo", label: "Response Demo" })

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <DemoScreen
          loaderData={{
            message: "Loader helper completed successfully.",
            outcome: "success",
          }}
        />
      </MemoryRouter>,
    )

    for (const label of [
      "Loader success",
      "Loader failure",
      "Loader redirect",
      "Action success",
      "Action failure",
      "Action redirect",
    ]) {
      expect(markup).toContain(label)
    }
  })
})
