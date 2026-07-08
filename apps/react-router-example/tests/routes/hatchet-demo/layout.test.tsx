import type { HttpResponseRedirect, HttpResponseSuccess } from "@effectify/react-router"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import routes from "../../../app/routes.js"
import HatchetDemoIndex from "../../../app/routes/hatchet-demo/index.js"
import HatchetDemoLayout, {
  hatchetDemoNavItems,
  loadHatchetDemoLayout,
} from "../../../app/routes/hatchet-demo/route.js"
import { runTestEffect } from "../_shared/effect-test.js"

const useLocationMock = vi.fn(() => ({ pathname: "/hatchet-demo/runs" }))

vi.mock("react-router", () => ({
  NavLink: ({
    children,
    to,
    ...props
  }: { children: React.ReactNode; to: string } & React.ComponentProps<"a">) =>
    React.createElement("a", { href: to, ...props }, children),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    React.createElement("a", { href: to }, children),
  Outlet: () => React.createElement("div", null, "child-route"),
  useLocation: () => useLocationMock(),
}))

vi.mock("../../../app/lib/runtime.server.js", () => ({
  withLoaderEffect: <A,>(effect: A) => effect,
}))

const expectRedirect = (
  response:
    | HttpResponseRedirect
    | HttpResponseSuccess<{
      ok: boolean
    }>,
  to: string,
) => {
  expect(response._tag).toBe("HttpResponseRedirect")
  if (response._tag !== "HttpResponseRedirect") {
    throw new Error(`Expected redirect response, got ${response._tag}`)
  }
  expect(response.to).toBe(to)
}

describe("hatchet demo route layout", () => {
  it("registers the nested hatchet demo child routes from foldered files", () => {
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "hatchet-demo",
          file: "./routes/hatchet-demo/route.tsx",
          children: expect.arrayContaining([
            expect.objectContaining({
              index: true,
              file: "./routes/hatchet-demo/index.tsx",
            }),
            expect.objectContaining({
              path: "runs",
              file: "./routes/hatchet-demo/runs/route.tsx",
            }),
            expect.objectContaining({
              path: "schedules",
              file: "./routes/hatchet-demo/schedules/route.tsx",
            }),
            expect.objectContaining({
              path: "crons",
              file: "./routes/hatchet-demo/crons/route.tsx",
            }),
            expect.objectContaining({
              path: "filters",
              file: "./routes/hatchet-demo/filters/route.tsx",
            }),
            expect.objectContaining({
              path: "webhooks",
              file: "./routes/hatchet-demo/webhooks/route.tsx",
            }),
            expect.objectContaining({
              path: "rate-limits",
              file: "./routes/hatchet-demo/rate-limits/route.tsx",
            }),
            expect.objectContaining({
              path: "management",
              file: "./routes/hatchet-demo/management/route.tsx",
            }),
            expect.objectContaining({
              path: "observability",
              file: "./routes/hatchet-demo/observability/route.tsx",
            }),
          ]),
        }),
      ]),
    )
  })

  it("renders navigation links for every hatchet demo slice", () => {
    const markup = renderToStaticMarkup(React.createElement(HatchetDemoLayout))

    expect(markup).toContain("Hatchet Demo")
    for (const item of hatchetDemoNavItems) {
      expect(markup).toContain(`href="${item.to}"`)
      expect(markup).toContain(item.label.replaceAll("&", "&amp;"))
    }
    expect(markup).toContain("child-route")
  })

  it("highlights the active navigation item", () => {
    useLocationMock.mockReturnValue({
      pathname: "/hatchet-demo/observability",
    })

    const markup = renderToStaticMarkup(React.createElement(HatchetDemoLayout))

    expect(markup).toContain('href="/hatchet-demo/observability"')
    expect(markup).toContain('aria-current="page"')
    expect(markup).toContain('data-active="true"')
    expect(markup).toContain('data-active="false"')
  })

  it("redirects legacy query links before child loaders run", async () => {
    const response = await runTestEffect(
      loadHatchetDemoLayout(
        new Request("https://example.com/hatchet-demo?eventId=event-1"),
      ),
    )

    expectRedirect(response, "/hatchet-demo/runs?eventId=event-1")
  })

  it("renders the overview page with slice links", () => {
    const markup = renderToStaticMarkup(React.createElement(HatchetDemoIndex))

    expect(markup).toContain("Start with runs")
    expect(markup).toContain("/hatchet-demo/runs")
    expect(markup).toContain("/hatchet-demo/observability")
  })
})
