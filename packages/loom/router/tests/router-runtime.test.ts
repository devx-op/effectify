import * as Schema from "effect/Schema"
import { Component, Html, Hydration } from "@effectify/loom"
import { describe, expect, it } from "vitest"
import { Decode, Fallback, Layout, Route, Router } from "../src/index.js"

const render = (router: Router.Definition, input: string | URL): string => {
  const output = Router.render(router, input)

  return output === undefined ? "" : Html.renderToString(output)
}

describe("@effectify/loom-router runtime", () => {
  it("decodes schema-backed params and query into the selected route context", () => {
    const router = Router.make({
      routes: [
        Route.make({
          path: "/posts/:postId",
          decode: {
            params: Decode.schema(Schema.Struct({ postId: Schema.Literal("42") })),
            search: Decode.schema(Schema.Struct({ page: Schema.Literal("2") })),
          },
          content: (context: Router.Context) =>
            Html.el("main", Html.children(`${context.params.postId}:${context.query.page}`)),
        }),
      ],
    })

    const result = Router.resolve(router, "/posts/42?page=2")

    expect(result._tag).toBe("LoomRouterResolveSuccess")

    if (result._tag !== "LoomRouterResolveSuccess") {
      throw new Error("expected a resolved route")
    }

    expect(result.context.params).toEqual({ postId: "42" })
    expect(result.context.query).toEqual({ page: "2" })
    expect(result.context.pathname).toBe("/posts/42")
    expect(result.context.matches).toHaveLength(1)
    expect(result.diagnostics).toEqual([])
    expect(result.diagnosticSummary).toEqual([])
    expect(render(router, "/posts/42?page=2")).toBe("<main>42:2</main>")
  })

  it("folds app and route layouts around a matched page with ordinary Loom HTML", () => {
    const router = Router.make({
      layout: Layout.make(({ child }) => Html.el("main", Html.children(child))),
      routes: [
        Route.make({
          path: "/dashboard",
          content: "dashboard-home",
          layout: Layout.make(({ child }) =>
            Html.el("section", Html.attr("data-layout", "dashboard"), Html.children(child))
          ),
          children: [
            Route.child({
              path: "settings",
              content: (context: Router.Context) => Html.el("p", Html.children(context.pathname)),
              layout: Layout.make(({ child }) =>
                Html.el("article", Html.attr("data-layout", "settings"), Html.children(child))
              ),
            }),
          ],
        }),
      ],
    })

    expect(render(router, "/dashboard/settings")).toBe(
      '<main><section data-layout="dashboard"><article data-layout="settings"><p>/dashboard/settings</p></article></section></main>',
    )
  })

  it("prefers the nearest route-level notFound fallback over the app default", () => {
    const router = Router.make({
      layout: Layout.make(({ child }) => Html.el("main", Html.children(child))),
      fallback: {
        notFound: Fallback.make(() => Html.el("p", Html.children("app-missing"))),
      },
      routes: [
        Route.make({
          path: "/dashboard",
          content: "dashboard-home",
          layout: Layout.make(({ child }) =>
            Html.el("section", Html.attr("data-layout", "dashboard"), Html.children(child))
          ),
          children: [
            Route.child({
              path: "settings",
              content: "settings-home",
              layout: Layout.make(({ child }) =>
                Html.el("article", Html.attr("data-layout", "settings"), Html.children(child))
              ),
              fallback: {
                notFound: Fallback.make((context: Router.Context) =>
                  Html.el("p", Html.children(`settings-missing:${context.pathname}`))
                ),
              },
            }),
          ],
        }),
      ],
    })

    const result = Router.resolve(router, "/dashboard/settings/missing")

    expect(result._tag).toBe("LoomRouterResolveNotFound")

    if (result._tag !== "LoomRouterResolveNotFound") {
      throw new Error("expected a routed notFound result")
    }

    expect(result.diagnosticSummary).toEqual([
      {
        phase: "router",
        total: 1,
        highestSeverity: "warn",
        hasErrors: false,
      },
    ])
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        phase: "router",
        highestSeverity: "warn",
        issues: [
          expect.objectContaining({
            phase: "router",
            severity: "warn",
            code: "loom.router.resolve.not-found",
            subject: "/dashboard/settings/missing",
          }),
        ],
      }),
    ])

    expect(render(router, "/dashboard/settings/missing")).toBe(
      '<main><section data-layout="dashboard"><article data-layout="settings"><p>settings-missing:/dashboard/settings/missing</p></article></section></main>',
    )
  })

  it("prefers invalidInput fallbacks for param and query decode failures before notFound fallbacks", () => {
    const router = Router.make({
      fallback: {
        notFound: Fallback.make(() => Html.el("p", Html.children("app-missing"))),
        invalidInput: Fallback.make(() => Html.el("p", Html.children("app-invalid"))),
      },
      routes: [
        Route.make({
          path: "/posts/:postId",
          decode: {
            params: Decode.schema(Schema.Struct({ postId: Schema.Literal("42") })),
            search: Decode.schema(Schema.Struct({ page: Schema.Literal("2") })),
          },
          content: (context: Router.Context) =>
            Html.el("main", Html.children(`${context.params.postId}:${context.query.page}`)),
          fallback: {
            notFound: Fallback.make(() => Html.el("p", Html.children("route-missing"))),
            invalidInput: Fallback.make(({ issues }: Router.InvalidInputContext) =>
              Html.el("p", Html.children(`route-invalid:${issues[0]?.phase ?? "none"}`))
            ),
          },
        }),
      ],
    })

    const paramsResult = Router.resolve(router, "/posts/nope?page=2")

    expect(paramsResult._tag).toBe("LoomRouterResolveInvalidInput")

    if (paramsResult._tag !== "LoomRouterResolveInvalidInput") {
      throw new Error("expected invalid-input router result")
    }

    expect(paramsResult.diagnosticSummary).toEqual([
      {
        phase: "router",
        total: 1,
        highestSeverity: "warn",
        hasErrors: false,
      },
    ])
    expect(paramsResult.diagnostics).toEqual([
      expect.objectContaining({
        phase: "router",
        highestSeverity: "warn",
        issues: [
          expect.objectContaining({
            code: "loom.router.resolve.invalid-input",
            subject: "/posts/:postId",
            details: expect.objectContaining({
              pathname: "/posts/nope",
              issueCount: 1,
            }),
          }),
        ],
      }),
    ])

    const searchResult = Router.resolve(router, "/posts/42?page=nope")

    expect(searchResult._tag).toBe("LoomRouterResolveInvalidInput")

    if (searchResult._tag !== "LoomRouterResolveInvalidInput") {
      throw new Error("expected invalid-input router result")
    }

    expect(searchResult.diagnostics[0]?.issues).toEqual([
      expect.objectContaining({
        code: "loom.router.resolve.invalid-input",
        details: expect.objectContaining({
          pathname: "/posts/42",
          issueCount: 1,
        }),
      }),
    ])

    expect(render(router, "/posts/nope?page=2")).toBe("<p>route-invalid:params</p>")
    expect(render(router, "/posts/42?page=nope")).toBe("<p>route-invalid:search</p>")
  })

  it("composes routed output through Html.ssr without changing hydration seams", () => {
    const router = Router.make({
      layout: Layout.make(({ child }) => Html.el("section", Html.attr("data-shell", "app"), Html.children(child))),
      routes: [
        Route.make({
          path: "/dashboard",
          content: Component.make(Html.el("span", Html.hydrate(Hydration.strategy.visible()), Html.children("ready"))),
        }),
      ],
    })

    const routed = Router.render(router, "/dashboard")
    const ssr = Html.ssr(Html.el("main", Html.attr("data-app", "root"), Html.children("before", routed ?? "", "after")))

    expect(ssr.html).toBe(
      '<main data-app="root">before<section data-shell="app"><!--loom-hydrate-start:b0--><span data-loom-hydrate="visible" data-loom-boundary="b0">ready</span><!--loom-hydrate-end:b0--></section>after</main>',
    )
    expect(ssr.plan.boundaries).toHaveLength(1)
    expect(ssr.plan.boundaries[0]).toMatchObject({
      id: "b0",
      strategy: "visible",
      attributes: {
        "data-loom-hydrate": "visible",
      },
    })
  })

  it("keeps fallback-rendered routed output compatible with Html.ssr composition", () => {
    const router = Router.make({
      routes: [
        Route.make({
          path: "/dashboard",
          content: "dashboard-home",
          layout: Layout.make(({ child }) =>
            Html.el("section", Html.attr("data-shell", "dashboard"), Html.children(child))
          ),
          fallback: {
            notFound: Fallback.make(() =>
              Component.make(
                Html.el("p", Html.hydrate(Hydration.strategy.visible()), Html.children("missing-dashboard")),
              )
            ),
          },
          children: [Route.child({ path: "settings", content: "settings-home" })],
        }),
      ],
    })

    const ssr = Html.ssr(Html.el("main", Html.children(Router.render(router, "/dashboard/unknown") ?? "")))

    expect(ssr.html).toBe(
      '<main><section data-shell="dashboard"><!--loom-hydrate-start:b0--><p data-loom-hydrate="visible" data-loom-boundary="b0">missing-dashboard</p><!--loom-hydrate-end:b0--></section></main>',
    )
    expect(ssr.plan.boundaries.map(({ id }) => id)).toEqual(["b0"])
  })
})
