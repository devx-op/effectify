import { pipe, ServiceMap } from "effect"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import * as Decode from "../src/decode.js"
import { Fallback, Layout, Route, RouteGroup, Router } from "../src/index.js"

const AppTitle = ServiceMap.Service<{ readonly value: string }>("AppTitle")
const GroupTitle = ServiceMap.Service<{ readonly value: string }>("GroupTitle")
const RouteTitle = ServiceMap.Service<{ readonly value: string }>("RouteTitle")

const readValue = (annotation: unknown): unknown =>
  typeof annotation === "object" && annotation !== null && "value" in annotation ? annotation.value : annotation

describe("@effectify/loom-router algebra", () => {
  it("composes router, route groups, prefixes, and merged annotations", () => {
    const sharedAnnotations = new Map([[RouteTitle.key, { value: "users-route" }]])
    const usersGroup = pipe(
      RouteGroup.make("users"),
      RouteGroup.prefix("/users"),
      RouteGroup.annotate(GroupTitle, { value: "users-group" }),
      RouteGroup.add(
        pipe(
          Route.make({ path: "/profile", content: "profile-screen" }),
          Route.annotateMerge(sharedAnnotations),
        ),
      ),
    )
    const router = pipe(
      Router.make("app"),
      Router.annotate(AppTitle, { value: "loom-app" }),
      Router.prefix("/app"),
      Router.add(usersGroup),
      Router.add(Route.make({ path: "/health", content: "ok" })),
    )

    const reflectedGroups: Array<{ title: unknown }> = []
    const reflectedRoutes: Array<{ path: string; app: unknown; group: unknown; route: unknown }> = []

    Router.reflect(router, {
      onGroup: ({ mergedAnnotations }) => {
        reflectedGroups.push({
          title: readValue(Route.getAnnotation(mergedAnnotations, GroupTitle)),
        })
      },
      onRoute: ({ group, mergedAnnotations, path }) => {
        reflectedRoutes.push({
          path,
          app: readValue(Route.getAnnotation(mergedAnnotations, AppTitle)),
          group: group === undefined ? undefined : readValue(Route.getAnnotation(mergedAnnotations, GroupTitle)),
          route: readValue(Route.getAnnotation(mergedAnnotations, RouteTitle)),
        })
      },
    })

    expect(Router.groups(router).map((group) => group.identifier)).toEqual(["users"])
    expect(Router.match(router, "/app/users/profile")._tag).toBe("LoomRouterMatchSuccess")
    expect(Router.match(router, "/app/health")._tag).toBe("LoomRouterMatchSuccess")
    expect(reflectedGroups).toEqual([{ title: "users-group" }])
    expect(reflectedRoutes).toEqual([
      {
        path: "/app/users/profile",
        app: "loom-app",
        group: "users-group",
        route: "users-route",
      },
      {
        path: "/app/health",
        app: "loom-app",
        group: undefined,
        route: undefined,
      },
    ])
  })

  it("keeps the legacy Router.make({ routes }) seam working while exposing reflection", () => {
    const compatRoute = Route.make({ path: "/users/:userId", content: "user-screen" })
    const compatRouter = Router.make({
      routes: [compatRoute],
    })
    const reflectedPaths: Array<string> = []

    Router.reflect(compatRouter, {
      onRoute: ({ path }) => {
        reflectedPaths.push(path)
      },
    })

    expect(Router.match(compatRouter, "/users/42")._tag).toBe("LoomRouterMatchSuccess")
    expect(reflectedPaths).toEqual(["/users/:userId"])
    expect(Router.pathFor(compatRouter, compatRoute)).toBe("/users/:userId")
    expect(Router.find(compatRouter, "missing")).toBeUndefined()
  })

  it("tracks optional route identifiers and resolves effective paths through the router seam", () => {
    const settingsRoute = Route.child({
      identifier: "settings",
      path: "settings",
      content: "settings-screen",
    })
    const usersRoute = Route.make({
      identifier: "users.detail",
      path: "/users/:userId",
      content: "user-screen",
    })
    const router = pipe(
      Router.make("app"),
      Router.prefix("/app"),
      Router.add(Route.make({ path: "/dashboard", content: "dashboard-home", children: [settingsRoute] })),
      Router.add(usersRoute),
    )

    expect(Route.identifier(settingsRoute)).toBe("settings")
    expect(Route.identifier(usersRoute)).toBe("users.detail")
    expect(Router.find(router, "users.detail")).toEqual(expect.objectContaining({ identifier: "users.detail" }))
    expect(Router.find(router, "missing")).toBeUndefined()
    expect(Router.pathFor(router, settingsRoute)).toBe("/app/dashboard/settings")
    expect(Router.pathFor(router, "settings")).toBe("/app/dashboard/settings")
    expect(Router.pathFor(router, usersRoute)).toBe("/app/users/:userId")
    expect(Router.pathFor(router, "users.detail")).toBe("/app/users/:userId")
    expect(Router.pathFor(router, "missing")).toBeUndefined()
  })

  it("builds router-aware hrefs for identifier and nested route targets", () => {
    const postsIndex = Route.index({
      identifier: "posts.index",
      content: "posts-home",
    })
    const postDetail = Route.child({
      identifier: "posts.detail",
      path: ":postId",
      content: "post-screen",
    })
    const router = pipe(
      Router.make("app"),
      Router.prefix("/app"),
      Router.add(
        Route.make({
          path: "/posts",
          content: "posts-shell",
          children: [postsIndex, postDetail],
        }),
      ),
    )

    expect(Router.href(router, "posts.index")).toBe("https://effectify.dev/app/posts")
    expect(Router.href(router, "posts.detail", { params: { postId: "42" }, query: { tab: "activity" } })).toBe(
      "https://effectify.dev/app/posts/42?tab=activity",
    )
    expect(Router.href(router, postDetail, { params: { postId: "7" } }, "https://loom.dev/base")).toBe(
      "https://loom.dev/app/posts/7",
    )
  })

  it("fails deterministically when an href identifier is ambiguous", () => {
    const router = pipe(
      Router.make("app"),
      Router.add(
        Route.make({
          path: "/posts",
          content: "posts-shell",
          children: [Route.child({ identifier: "duplicate", path: ":postId", content: "detail" })],
        }),
      ),
      Router.add(Route.make({ identifier: "duplicate", path: "/duplicate", content: "duplicate-screen" })),
    )

    expect(() => Router.href(router, "duplicate")).toThrowError(
      expect.objectContaining({
        _tag: "LoomRouterHrefResolutionError",
        details: expect.objectContaining({
          routerIdentifier: "app",
          reason: "ambiguous",
          candidates: ["/posts/:postId", "/duplicate"],
        }),
      }),
    )
  })

  it("rejects unknown href query keys for typed router targets", () => {
    const runtimeTarget: Route.Definition<string, Route.Params, Route.Search, string, readonly []> = Route.child({
      identifier: "posts.detail",
      path: ":postId",
      decode: {
        search: Decode.schema(Schema.Struct({ tab: Schema.Literal("activity") })),
      },
      content: "post-screen",
    })
    const router = Router.make({
      routes: [Route.make({ path: "/posts", content: "posts-home", children: [runtimeTarget] })],
    })
    const invalidQuery: Route.Search = { tab: "activity", extra: "ignored" }

    expect(() =>
      Router.href(router, runtimeTarget, {
        params: { postId: "42" },
        query: invalidQuery,
      })
    ).toThrowError(/Unknown search keys: extra/)
  })

  it("directs relative route href callers to Router.href", () => {
    const postDetail = Route.child({
      identifier: "posts.detail",
      path: ":postId",
      content: "post-screen",
    })

    expect(() => Route.href(postDetail, { params: { postId: "42" } })).toThrowError(
      "Route.href(...) only supports absolute routes. Use Router.href(router, route, ...) for relative child/index routes.",
    )
  })

  it("reflects inherited layout and fallback metadata for route introspection", () => {
    const appLayout = Layout.make("app-layout")
    const appNotFound = Fallback.make("app-missing")
    const appInvalid = Fallback.make("app-invalid")
    const postsLayout = Layout.make("posts-layout")
    const postLayout = Layout.make("post-layout")
    const postMissing = Fallback.make("post-missing")
    const postInvalid = Fallback.make("post-invalid")
    const router = Router.make({
      routes: [
        Route.make({
          path: "/posts",
          content: "posts-home",
          layout: postsLayout,
          children: [
            Route.child({
              path: ":postId",
              content: "post-screen",
              layout: postLayout,
              fallback: {
                notFound: postMissing,
                invalidInput: postInvalid,
              },
            }),
          ],
        }),
      ],
      layout: appLayout,
      fallback: {
        notFound: appNotFound,
        invalidInput: appInvalid,
      },
    })
    const reflected: Array<{
      path: string
      layouts: ReadonlyArray<string | undefined>
      notFound: unknown
      invalidInput: unknown
    }> = []

    Router.reflect(router, {
      onRoute: ({ path, layouts, fallback }) => {
        reflected.push({
          path,
          layouts: layouts.map(Layout.name),
          notFound: fallback.notFound === undefined ? undefined : Fallback.content(fallback.notFound),
          invalidInput: fallback.invalidInput === undefined ? undefined : Fallback.content(fallback.invalidInput),
        })
      },
    })

    expect(reflected).toEqual([
      {
        path: "/posts",
        layouts: ["app-layout", "posts-layout"],
        notFound: "app-missing",
        invalidInput: "app-invalid",
      },
      {
        path: "/posts/:postId",
        layouts: ["app-layout", "posts-layout", "post-layout"],
        notFound: "post-missing",
        invalidInput: "post-invalid",
      },
    ])
  })
})
