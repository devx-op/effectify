import { describe, expect, it } from "vitest"
import { ActionInput, Route, Router, Runtime } from "../src/index.js"

describe("@effectify/loom-router loaders/actions runtime", () => {
  it("stores loader/action descriptors on the route DSL without executing them during resolve", () => {
    const calls = {
      action: 0,
      loader: 0,
    }
    const route = Route.action(
      Route.loader(
        Route.make({
          identifier: "users.detail",
          path: "/users/:userId",
          content: "user-screen",
        }),
        {
          load: async (
            { context, services }: { readonly context: Router.Context; readonly services: { readonly prefix: string } },
          ) => {
            calls.loader += 1

            return `${services.prefix}:${context.params.userId}`
          },
          mapError: (cause: unknown) => ({ message: String(cause) }),
        },
      ),
      {
        handle: async (
          { input, services }: {
            readonly input: { readonly title: string }
            readonly services: { readonly suffix: string }
          },
        ) => {
          calls.action += 1

          return `${input.title}:${services.suffix}`
        },
        mapError: (cause: unknown) => ({ message: String(cause) }),
      },
    )
    const router = Router.make({ routes: [route] })
    const result = Router.resolve(router, "/users/42")

    expect(result._tag).toBe("LoomRouterResolveSuccess")
    expect(Route.hasLoader(route)).toBe(true)
    expect(Route.hasAction(route)).toBe(true)
    expect(Route.getLoader(route)).toMatchObject({ _tag: "LoomRouterLoaderDescriptor" })
    expect(Route.getAction(route)).toMatchObject({ _tag: "LoomRouterActionDescriptor" })
    expect(calls).toEqual({ action: 0, loader: 0 })
  })

  it("executes loaders and revalidation through the async runtime boundary", async () => {
    const route = Route.loader(
      Route.make({
        identifier: "users.detail",
        path: "/users/:userId",
        content: "user-screen",
      }),
      {
        load: async (
          { context, services }: { readonly context: Router.Context; readonly services: { readonly prefix: string } },
        ) => `${services.prefix}:${context.params.userId}`,
        mapError: (cause: unknown) => ({ message: String(cause) }),
      },
    )
    const router = Router.make({ routes: [route] })
    const resolved = Router.resolve(router, "/users/42")

    if (!Router.isResolveSuccess(resolved)) {
      throw new Error("expected a resolved route")
    }

    expect(Runtime.loading(route)).toEqual({
      _tag: "loading",
      route,
    })

    const loaded = await Runtime.load({
      resolved,
      services: { prefix: "user" },
    })

    if (loaded._tag !== "success") {
      throw new Error("expected a successful loader state")
    }

    expect(loaded).toEqual({
      _tag: "success",
      data: "user:42",
      route,
    })

    expect(Runtime.revalidating(route, "user:42")).toEqual({
      _tag: "revalidating",
      data: "user:42",
      route,
    })

    const refreshed = await Runtime.revalidate({
      previous: "user:42",
      resolved,
      services: { prefix: "next" },
    })

    if (refreshed._tag !== "success") {
      throw new Error("expected a successful revalidation state")
    }

    expect(refreshed).toEqual({
      _tag: "success",
      data: "next:42",
      route,
    })
  })

  it("maps loader failures into typed states and preserves prior data on revalidation failure", async () => {
    const route = Route.loader(
      Route.make({
        identifier: "users.detail",
        path: "/users/:userId",
        content: "user-screen",
      }),
      {
        load: async ({ services }: { readonly services: { readonly shouldFail: boolean } }) => {
          if (services.shouldFail) {
            throw new Error("loader failed")
          }

          return "ok"
        },
        mapError: (cause: unknown) => ({
          message: cause instanceof Error ? cause.message : String(cause),
        }),
      },
    )
    const router = Router.make({ routes: [route] })
    const resolved = Router.resolve(router, "/users/42")

    if (!Router.isResolveSuccess(resolved)) {
      throw new Error("expected a resolved route")
    }

    const initialFailure = await Runtime.load({
      resolved,
      services: { shouldFail: true },
    })

    expect(initialFailure).toEqual({
      _tag: "failure",
      error: { message: "loader failed" },
      route,
    })

    const staleFailure = await Runtime.revalidate({
      previous: "stale-user",
      resolved,
      services: { shouldFail: true },
    })

    expect(staleFailure).toEqual({
      _tag: "failure",
      data: "stale-user",
      error: { message: "loader failed" },
      route,
    })
  })

  it("executes actions through the async runtime boundary and returns typed action states", async () => {
    const route = Route.action(
      Route.make({
        identifier: "users.detail",
        path: "/users/:userId",
        content: "user-screen",
      }),
      {
        decodeInput: ActionInput.make<{ readonly title: string }>((input) => {
          const title = Array.isArray(input.title) ? input.title[0] : input.title

          return typeof title === "string" && title.length > 0
            ? ActionInput.succeed({ title })
            : ActionInput.fail("title is required", input)
        }),
        handle: async (
          { input, services }: {
            readonly input: { readonly title: string }
            readonly services: { readonly suffix: string }
          },
        ) => {
          if (input.title === "fail") {
            throw new Error("action failed")
          }

          return `${input.title}:${services.suffix}`
        },
        mapError: (cause: unknown) => ({
          message: cause instanceof Error ? cause.message : String(cause),
        }),
      },
    )
    const router = Router.make({ routes: [route] })
    const resolved = Router.resolve(router, "/users/42")

    if (!Router.isResolveSuccess(resolved)) {
      throw new Error("expected a resolved route")
    }

    expect(Runtime.submitting(route, { title: "draft" })).toEqual({
      _tag: "submitting",
      input: { title: "draft" },
      route,
    })

    const success = await Runtime.submit({
      resolved,
      submission: { title: "save" },
      services: { suffix: "done" },
    })

    expect(success).toEqual({
      _tag: "success",
      result: "save:done",
      revalidated: false,
      route,
    })

    const failure = await Runtime.submit({
      resolved,
      submission: { title: "fail" },
      services: { suffix: "done" },
    })

    expect(failure).toEqual({
      _tag: "failure",
      error: { message: "action failed" },
      route,
    })
  })

  it("returns an explicit invalid-input action state without calling the action handler", async () => {
    let actionCalls = 0
    const route = Route.action(
      Route.make({
        identifier: "users.detail",
        path: "/users/:userId",
        content: "user-screen",
      }),
      {
        decodeInput: ActionInput.make<{ readonly title: string }>((input) => {
          const title = Array.isArray(input.title) ? input.title[0] : input.title

          return typeof title === "string" && title.trim().length > 0
            ? ActionInput.succeed({ title: title.trim() })
            : ActionInput.fail("title is required", input)
        }),
        handle: async ({ input }: { readonly input: { readonly title: string } }) => {
          actionCalls += 1
          return input.title
        },
        mapError: (cause: unknown) => ({
          message: cause instanceof Error ? cause.message : String(cause),
        }),
      },
    )
    const router = Router.make({ routes: [route] })
    const resolved = Router.resolve(router, "/users/42")

    if (!Router.isResolveSuccess(resolved)) {
      throw new Error("expected a resolved route")
    }

    const invalid = await Runtime.submit({
      resolved,
      submission: { title: "   " },
      services: {},
    })

    expect(invalid).toEqual({
      _tag: "invalid-input",
      issues: [{ _tag: "LoomRouterActionInputFailure", input: { title: "   " }, message: "title is required" }],
      route,
      submission: { title: "   " },
    })
    expect(actionCalls).toBe(0)
  })
})
