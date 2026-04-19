import { pipe, ServiceMap } from "effect"
import { describe, expect, it } from "vitest"
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
    const compatRouter = Router.make({
      routes: [Route.make({ path: "/users/:userId", content: "user-screen" })],
    })
    const reflectedPaths: Array<string> = []

    Router.reflect(compatRouter, {
      onRoute: ({ path }) => {
        reflectedPaths.push(path)
      },
    })

    expect(Router.match(compatRouter, "/users/42")._tag).toBe("LoomRouterMatchSuccess")
    expect(reflectedPaths).toEqual(["/users/:userId"])
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
