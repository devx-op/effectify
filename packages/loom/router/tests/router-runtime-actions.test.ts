import { Data, pipe } from "effect"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import { Route, Router, Runtime, Submission } from "../src/index.js"
import * as RouteErrors from "../src/internal/route-errors.js"
import * as RouteModule from "../src/route-module.js"

class SaveFailure extends Data.TaggedError("SaveFailure")<{
  readonly message: string
}> {}

const expectResolveSuccess = <Self extends Router.ResolveResult>(result: Self): Self & Router.ResolveSuccess => {
  if (!Router.isResolveSuccess(result)) {
    throw new Error("expected a resolved route")
  }

  return result as Self & Router.ResolveSuccess
}

const expectInvalidInput = <Self extends Route.AnyDefinition>(
  state: Runtime.ActionState<Self>,
): Extract<Runtime.ActionState<Self>, { _tag: "invalid-input" }> => {
  if (state._tag !== "invalid-input") {
    throw new Error("expected invalid-input action state")
  }

  return state as Extract<Runtime.ActionState<Self>, { _tag: "invalid-input" }>
}

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
    const resolved = expectResolveSuccess(Router.resolve(router, "/users/42"))

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
    const resolved = expectResolveSuccess(Router.resolve(router, "/users/42"))

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
        input: Submission.make<{ readonly title: string }>((input) => {
          const title = Array.isArray(input.title) ? input.title[0] : input.title

          return typeof title === "string" && title.length > 0
            ? Submission.succeed({ title })
            : Submission.fail("title is required", input)
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
    const resolved = expectResolveSuccess(Router.resolve(router, "/users/42"))

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
        input: Submission.make<{ readonly title: string }>((input) => {
          const title = Array.isArray(input.title) ? input.title[0] : input.title

          return typeof title === "string" && title.trim().length > 0
            ? Submission.succeed({ title: title.trim() })
            : Submission.fail("title is required", input)
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

    expect(expectInvalidInput(invalid)).toEqual({
      _tag: "invalid-input",
      issues: [{ _tag: "LoomRouterActionInputFailure", input: { title: "   " }, message: "title is required" }],
      route,
      submission: { title: "   " },
    })
    expect(actionCalls).toBe(0)
  })

  it("supports direct action input and preserves the revalidated success flag", async () => {
    const route = Route.action(
      Route.make({
        identifier: "users.detail",
        path: "/users/:userId",
        content: "user-screen",
      }),
      {
        handle: async ({ input }: { readonly input: { readonly title: string } }) => input.title,
        mapError: (cause: unknown) => ({ message: String(cause) }),
      },
    )
    const resolved = expectResolveSuccess(Router.resolve(Router.make({ routes: [route] }), "/users/42"))

    const submitted = await Runtime.submit({
      input: { title: "save" },
      revalidated: true,
      resolved,
      services: {},
    })

    expect(submitted).toEqual({
      _tag: "success",
      result: "save",
      revalidated: true,
      route,
    })
  })

  it("executes compiled default-export route-module loaders and actions through the runtime boundary", async () => {
    const route = RouteModule.compile({
      identifier: "users.detail",
      module: {
        default: "user-screen",
        loader: Route.loader({
          params: Schema.Struct({ userId: Schema.String }),
          search: Schema.Struct({ tab: Schema.String }),
          load: ({
            params,
            search,
            services,
          }: {
            readonly params: { readonly userId: string }
            readonly search: { readonly tab: string }
            readonly services: { readonly prefix: string }
          }) => Effect.succeed(`${services.prefix}:${params.userId}:${search.tab}`),
        }),
        action: Route.action({
          params: Schema.Struct({ userId: Schema.String }),
          search: Schema.Struct({ tab: Schema.String }),
          input: Submission.make((submission) =>
            typeof submission.title === "string"
              ? Submission.succeed({ title: submission.title })
              : Submission.fail("title is required", submission)
          ),
          handle: ({
            input,
            params,
            search,
            services,
          }: {
            readonly input: { readonly title: string }
            readonly params: { readonly userId: string }
            readonly search: { readonly tab: string }
            readonly services: { readonly suffix: string }
          }) => Effect.succeed(`${input.title}:${params.userId}:${search.tab}:${services.suffix}`),
        }),
      },
      path: "/users/:userId",
    })
    const router = Router.make({ routes: [route] })
    const resolved = Router.resolve(router, "/users/42?tab=profile")

    if (!Router.isResolveSuccess(resolved)) {
      throw new Error("expected a resolved route")
    }

    const loaded = await Runtime.load({
      resolved,
      services: { prefix: "user" },
    })
    const submitted = await Runtime.submit({
      resolved,
      submission: { title: "save" },
      services: { suffix: "done" },
    })

    expect(loaded).toEqual({
      _tag: "success",
      data: "user:42:profile",
      route,
    })
    expect(submitted).toEqual({
      _tag: "success",
      result: "save:42:profile:done",
      revalidated: false,
      route,
    })
  })

  it("maps Effect failures and defects into structured route boundary errors", async () => {
    const failureRoute = RouteModule.compile({
      identifier: "users.failure",
      module: {
        component: "user-screen",
        loader: pipe(
          () => Effect.fail(new SaveFailure({ message: "loader failed" })),
          Route.loader(),
        ),
      },
      path: "/users/:userId",
    })
    const defectRoute = RouteModule.compile({
      identifier: "users.defect",
      module: {
        component: "user-screen",
        action: pipe(
          () => Effect.die("boom"),
          Route.action({
            input: Submission.make((submission) =>
              typeof submission.title === "string"
                ? Submission.succeed({ title: submission.title })
                : Submission.fail("title is required", submission)
            ),
          }),
        ),
      },
      path: "/users/:userId/defect",
    })
    const failureResolved = Router.resolve(Router.make({ routes: [failureRoute] }), "/users/42")
    const defectResolved = Router.resolve(Router.make({ routes: [defectRoute] }), "/users/42/defect")

    if (!Router.isResolveSuccess(failureResolved) || !Router.isResolveSuccess(defectResolved)) {
      throw new Error("expected resolved routes")
    }

    const loadState = await Runtime.load({
      resolved: failureResolved,
      services: {},
    })
    const actionState = await Runtime.submit({
      resolved: defectResolved,
      submission: { title: "save" },
      services: {},
    })

    expect(loadState).toMatchObject({
      _tag: "failure",
      error: new RouteErrors.RouteLoaderFailure({ error: new SaveFailure({ message: "loader failed" }) }),
      route: failureRoute,
    })
    expect(actionState).toMatchObject({
      _tag: "failure",
      error: new RouteErrors.RouteActionDefect({ defect: "boom" }),
      route: defectRoute,
    })
  })

  it("validates module helper output and error values against their schemas", async () => {
    const LoaderOutput = Schema.Struct({ id: Schema.String })
    const ActionOutput = Schema.Struct({ savedTitle: Schema.String })
    const SaveFailureSchema = Schema.TaggedStruct("SaveFailure", { message: Schema.String })

    const schemaRoute = RouteModule.compile({
      identifier: "users.schema",
      module: {
        component: "user-screen",
        loader: Route.loader({
          params: Schema.Struct({ userId: Schema.String }),
          output: LoaderOutput,
          load: ({ params }) => Effect.succeed({ id: params.userId }),
        }),
        action: Route.action({
          input: Schema.Struct({ title: Schema.String }),
          output: ActionOutput,
          error: SaveFailureSchema,
          handle: ({ input }) => Effect.fail(new SaveFailure({ message: input.title })),
        }),
      },
      path: "/users/:userId",
    })
    const invalidLoaderRoute = RouteModule.compile({
      identifier: "users.invalid-loader-output",
      module: {
        component: "user-screen",
        loader: Route.loader({
          output: LoaderOutput,
          load: () => Effect.sync(() => JSON.parse('{"id":42}')),
        }),
      },
      path: "/users/:userId/invalid-loader",
    })
    const invalidActionRoute = RouteModule.compile({
      identifier: "users.invalid-action-error",
      module: {
        component: "user-screen",
        action: Route.action({
          input: Schema.Struct({ title: Schema.String }),
          output: ActionOutput,
          error: SaveFailureSchema,
          handle: () => Effect.fail(JSON.parse('{"nope":true}')),
        }),
      },
      path: "/users/:userId/invalid-action",
    })

    const schemaResolved = Router.resolve(Router.make({ routes: [schemaRoute] }), "/users/42")
    const invalidLoaderResolved = Router.resolve(
      Router.make({ routes: [invalidLoaderRoute] }),
      "/users/42/invalid-loader",
    )
    const invalidActionResolved = Router.resolve(
      Router.make({ routes: [invalidActionRoute] }),
      "/users/42/invalid-action",
    )

    if (
      !Router.isResolveSuccess(schemaResolved)
      || !Router.isResolveSuccess(invalidLoaderResolved)
      || !Router.isResolveSuccess(invalidActionResolved)
    ) {
      throw new Error("expected resolved routes")
    }

    const schemaLoaded = await Runtime.load({
      resolved: schemaResolved,
      services: {},
    })
    const schemaSubmitted = await Runtime.submit({
      resolved: schemaResolved,
      submission: { title: "typed failure" },
      services: {},
    })
    const invalidLoaded = await Runtime.load({
      resolved: invalidLoaderResolved,
      services: {},
    })
    const invalidSubmitted = await Runtime.submit({
      resolved: invalidActionResolved,
      submission: { title: "typed failure" },
      services: {},
    })

    expect(schemaLoaded).toEqual({
      _tag: "success",
      data: { id: "42" },
      route: schemaRoute,
    })
    expect(schemaSubmitted).toEqual({
      _tag: "failure",
      error: new RouteErrors.RouteActionFailure({ error: { _tag: "SaveFailure", message: "typed failure" } }),
      route: schemaRoute,
    })
    expect(invalidLoaded).toEqual({
      _tag: "failure",
      error: new RouteErrors.RouteLoaderDefect({
        defect: new RouteErrors.RouteSchemaContractError({
          issue: expect.anything(),
          phase: "loader-output",
          value: { id: 42 },
        }),
      }),
      route: invalidLoaderRoute,
    })
    expect(invalidSubmitted).toEqual({
      _tag: "failure",
      error: new RouteErrors.RouteActionDefect({
        defect: new RouteErrors.RouteSchemaContractError({
          issue: expect.anything(),
          phase: "action-error",
          value: { nope: true },
        }),
      }),
      route: invalidActionRoute,
    })
  })
})
