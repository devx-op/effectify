import { readFileSync } from "node:fs"
import * as Result from "effect/Result"
import { describe, expect, it } from "vitest"
import { Decode, Fallback, Layout, Link, Match, Navigation, Route, RouteGroup, Router } from "../src/index.js"

const manifestUrl = new URL("../package.json", import.meta.url)

describe("@effectify/loom-router public surface", () => {
  it("re-exports namespace modules from the package root and subpath exports", () => {
    const manifest = JSON.parse(readFileSync(manifestUrl, "utf8"))

    expect(typeof Router.make).toBe("function")
    expect(typeof Router.match).toBe("function")
    expect(typeof Route.make).toBe("function")
    expect(typeof Match.isSuccess).toBe("function")
    expect(typeof Decode.make).toBe("function")
    expect(typeof Layout.make).toBe("function")
    expect(typeof Fallback.make).toBe("function")
    expect(typeof Route.href).toBe("function")
    expect(typeof Navigation.memory).toBe("function")
    expect(typeof Link.intercept).toBe("function")
    expect(typeof RouteGroup.make).toBe("function")

    expect(Object.keys(manifest.exports)).toEqual([
      ".",
      "./Decode",
      "./Fallback",
      "./Layout",
      "./Link",
      "./Match",
      "./Navigation",
      "./Route",
      "./RouteGroup",
      "./Router",
    ])
  })

  it("matches parameterized routes and preserves search, layout, and route content", () => {
    const shell = Layout.make("shell")
    const notFound = Fallback.make("missing")
    const users = Route.make({
      path: "/users/:userId",
      content: "user-screen",
    })
    const router = Router.make({
      routes: [users],
      layout: shell,
      fallback: notFound,
    })

    const result = Router.match(router, "/users/42?tab=profile&tab=activity")

    expect(Match.isSuccess(result)).toBe(true)

    if (!Match.isSuccess(result)) {
      throw new Error("expected a successful match")
    }

    expect(Route.path(result.route)).toBe("/users/:userId")
    expect(Route.content(result.route)).toBe("user-screen")
    expect(result.params).toEqual({ userId: "42" })
    expect(result.search).toEqual({
      tab: ["profile", "activity"],
    })
    expect(result.layout).toEqual(shell)
  })

  it("returns a miss that carries the configured fallback boundary", () => {
    const router = Router.make({
      routes: [Route.make({ path: "/", content: "home" })],
      fallback: Fallback.make("missing"),
    })

    const result = Router.match(router, "/settings")

    expect(Match.isMiss(result)).toBe(true)

    if (!Match.isMiss(result)) {
      throw new Error("expected a miss")
    }

    expect(result.pathname).toBe("/settings")
    expect(result.fallback).toEqual(Fallback.make("missing"))
  })

  it("surfaces structured decode issues for params and search boundaries", () => {
    const route = Route.make({
      path: "/users/:userId",
      content: "user-screen",
      decode: {
        params: Decode.make((params) =>
          /^\d+$/.test(params.userId ?? "")
            ? Result.succeed({ userId: params.userId })
            : Decode.fail("userId must be numeric", params)
        ),
        search: Decode.make((search) =>
          typeof search.tab === "string" ? Result.succeed({ tab: search.tab }) : Decode.fail("tab is required", search)
        ),
      },
    })
    const router = Router.make({ routes: [route] })

    const result = Router.match(router, "/users/nope")

    expect(Match.isDecodeFailure(result)).toBe(true)

    if (!Match.isDecodeFailure(result)) {
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
})
