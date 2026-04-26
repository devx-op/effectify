import { readFileSync } from "node:fs"
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import * as LoomRouter from "../src/index.js"

const manifestUrl = new URL("../package.json", import.meta.url)

describe("@effectify/loom-router public surface", () => {
  it("re-exports namespace modules from the package root and subpath exports", () => {
    const manifest = JSON.parse(readFileSync(manifestUrl, "utf8"))

    expect(typeof LoomRouter.Router.make).toBe("function")
    expect(typeof LoomRouter.Router.match).toBe("function")
    expect(typeof LoomRouter.Router.pathFor).toBe("function")
    expect(typeof LoomRouter.Router.href).toBe("function")
    expect(typeof LoomRouter.Route.make).toBe("function")
    expect(typeof LoomRouter.Route.identifier).toBe("function")
    expect(typeof LoomRouter.Match.isSuccess).toBe("function")
    expect(typeof LoomRouter.Decode.make).toBe("function")
    expect(typeof LoomRouter.Layout.make).toBe("function")
    expect(typeof LoomRouter.Fallback.make).toBe("function")
    expect(typeof LoomRouter.Route.href).toBe("function")
    expect(typeof LoomRouter.RouteModule.compile).toBe("function")
    expect(typeof LoomRouter.RouteModule.extract).toBe("function")
    expect(typeof LoomRouter.Navigation.memory).toBe("function")
    expect(typeof LoomRouter.Link.intercept).toBe("function")
    expect(typeof LoomRouter.RouteGroup.make).toBe("function")
    expect(typeof LoomRouter.Runtime.load).toBe("function")
    expect(typeof LoomRouter.Submission.normalize).toBe("function")
    expect("ActionInput" in LoomRouter).toBe(false)

    expect(Object.keys(manifest.exports)).toEqual([
      ".",
      "./Decode",
      "./Fallback",
      "./Layout",
      "./Link",
      "./Match",
      "./Navigation",
      "./Route",
      "./RouteModule",
      "./RouteGroup",
      "./Router",
      "./Runtime",
      "./Submission",
    ])
  })

  it("matches parameterized routes and preserves search, layout, and route content", () => {
    const shell = LoomRouter.Layout.make("shell")
    const notFound = LoomRouter.Fallback.make("missing")
    const users = LoomRouter.Route.make({
      path: "/users/:userId",
      content: "user-screen",
    })
    const router = LoomRouter.Router.make({
      routes: [users],
      layout: shell,
      fallback: notFound,
    })

    const result = LoomRouter.Router.match(router, "/users/42?tab=profile&tab=activity")

    expect(LoomRouter.Match.isSuccess(result)).toBe(true)

    if (!LoomRouter.Match.isSuccess(result)) {
      throw new Error("expected a successful match")
    }

    expect(LoomRouter.Route.path(result.route)).toBe("/users/:userId")
    expect(LoomRouter.Route.content(result.route)).toBe("user-screen")
    expect(result.params).toEqual({ userId: "42" })
    expect(result.search).toEqual({
      tab: ["profile", "activity"],
    })
    expect(result.layout).toEqual(shell)
  })

  it("returns a miss that carries the configured fallback boundary", () => {
    const router = LoomRouter.Router.make({
      routes: [LoomRouter.Route.make({ path: "/", content: "home" })],
      fallback: LoomRouter.Fallback.make("missing"),
    })

    const result = LoomRouter.Router.match(router, "/settings")

    expect(LoomRouter.Match.isMiss(result)).toBe(true)

    if (!LoomRouter.Match.isMiss(result)) {
      throw new Error("expected a miss")
    }

    expect(result.pathname).toBe("/settings")
    expect(result.fallback).toEqual(LoomRouter.Fallback.make("missing"))
  })

  it("surfaces structured decode issues for params and search boundaries", () => {
    const route = LoomRouter.Route.make({
      path: "/users/:userId",
      content: "user-screen",
      decode: {
        params: LoomRouter.Decode.make((params) =>
          /^\d+$/.test(params.userId ?? "")
            ? Result.succeed({ userId: params.userId })
            : LoomRouter.Decode.fail("userId must be numeric", params)
        ),
        search: LoomRouter.Decode.make((search) =>
          typeof search.tab === "string"
            ? Result.succeed({ tab: search.tab })
            : LoomRouter.Decode.fail("tab is required", search)
        ),
      },
    })
    const router = LoomRouter.Router.make({ routes: [route] })

    const result = LoomRouter.Router.match(router, "/users/nope")

    expect(LoomRouter.Match.isDecodeFailure(result)).toBe(true)

    if (!LoomRouter.Match.isDecodeFailure(result)) {
      throw new Error("expected a decode failure")
    }

    expect(result.issues).toEqual([
      {
        _tag: "LoomRouterDecodeFailure",
        phase: "params",
        message: "userId must be numeric",
        input: { userId: "nope" },
      },
      {
        _tag: "LoomRouterDecodeFailure",
        phase: "search",
        message: "tab is required",
        input: {},
      },
    ])
  })

  it("creates Effect-first route-module helpers without attaching them to a route definition", () => {
    const loader = LoomRouter.Route.loader({
      params: Schema.Struct({ userId: Schema.String }),
      load: ({ params }) => Effect.succeed({ id: params.userId }),
    })
    const action = LoomRouter.Route.action({
      input: Schema.Struct({ title: Schema.String }),
      handle: ({ input }) => Effect.succeed({ savedTitle: input.title }),
    })

    expect(loader).toMatchObject({ _tag: "LoomRouterModuleLoader" })
    expect(action).toMatchObject({ _tag: "LoomRouterModuleAction" })
  })
})
