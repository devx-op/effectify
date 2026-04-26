import { describe, expect, it } from "vitest"
import { Fallback, Match, Route, Router } from "../src/index.js"

describe("@effectify/loom-router matcher", () => {
  it("matches a static top-level route", () => {
    const router = Router.make({
      routes: [Route.make({ path: "/about", content: "about-screen" })],
    })

    const result = Router.match(router, "/about")

    expect(Match.isSuccess(result)).toBe(true)

    if (!Match.isSuccess(result)) {
      throw new Error("expected a static route match")
    }

    expect(Route.content(result.route)).toBe("about-screen")
    expect(result.params).toEqual({})
    expect(result.pathname).toBe("/about")
  })

  it("matches nested static children through a real route tree", () => {
    const router = Router.make({
      routes: [
        Route.make({
          path: "/posts",
          content: "posts-layout",
          children: [Route.child({ path: "archive", content: "posts-archive" })],
        }),
      ],
    })

    const result = Router.match(router, "/posts/archive")

    expect(Match.isSuccess(result)).toBe(true)

    if (!Match.isSuccess(result)) {
      throw new Error("expected a nested route match")
    }

    expect(Route.content(result.route)).toBe("posts-archive")
    expect(result.params).toEqual({})
    expect(result.pathname).toBe("/posts/archive")
  })

  it("matches nested param children and decodes params from the leaf route", () => {
    const router = Router.make({
      routes: [
        Route.make({
          path: "/posts",
          content: "posts-layout",
          children: [Route.child({ path: ":postId", content: "post-screen" })],
        }),
      ],
    })

    const result = Router.match(router, "/posts/42")

    expect(Match.isSuccess(result)).toBe(true)

    if (!Match.isSuccess(result)) {
      throw new Error("expected a nested param route match")
    }

    expect(Route.content(result.route)).toBe("post-screen")
    expect(result.params).toEqual({ postId: "42" })
  })

  it("prefers more specific static children before params and falls back when nothing matches", () => {
    const router = Router.make({
      routes: [
        Route.make({
          path: "/posts",
          content: "posts-layout",
          children: [
            Route.child({ path: ":postId", content: "post-screen" }),
            Route.child({ path: "new", content: "new-post-screen" }),
            Route.index({ content: "posts-index" }),
          ],
        }),
      ],
      fallback: Fallback.make("missing"),
    })

    const specific = Router.match(router, "/posts/new")

    expect(Match.isSuccess(specific)).toBe(true)

    if (!Match.isSuccess(specific)) {
      throw new Error("expected a specific static child route match")
    }

    expect(Route.content(specific.route)).toBe("new-post-screen")
    expect(specific.params).toEqual({})

    const miss = Router.match(router, "/posts/new/comments")

    expect(Match.isMiss(miss)).toBe(true)

    if (!Match.isMiss(miss)) {
      throw new Error("expected a miss for unsupported deeper nesting")
    }

    expect(miss.fallback).toEqual(Fallback.make("missing"))
  })

  it("rejects unsupported wildcard child paths explicitly", () => {
    expect(() =>
      Route.make({
        path: "/posts",
        content: "posts-layout",
        children: [Route.child({ path: "*", content: "unsupported" })],
      })
    ).toThrowError("Wildcard path segments are not supported in the initial router slice")
  })
})
