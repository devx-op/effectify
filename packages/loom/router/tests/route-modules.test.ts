import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import * as Route from "../src/route.js"
import * as RouteModule from "../src/route-module.js"
import * as RouteErrors from "../src/internal/route-errors.js"

describe("@effectify/loom-router route modules", () => {
  it("extracts and compiles route-module exports into route definitions", () => {
    const params = Schema.Struct({ userId: Schema.String })
    const search = Schema.Struct({ tab: Schema.String })
    const input = Schema.Struct({ title: Schema.String })
    const output = Schema.Struct({ id: Schema.String })
    const actionResult = Schema.Struct({ savedTitle: Schema.String })
    const actionError = Schema.TaggedStruct("SaveFailure", { message: Schema.String })
    const routeModule = RouteModule.extract({
      component: "user-screen",
      loader: Route.loader({
        params,
        search,
        output,
        load: ({ params }) => Effect.succeed({ id: params.userId }),
      }),
      action: Route.action({
        input,
        output: actionResult,
        error: actionError,
        handle: ({ input }) => Effect.succeed({ savedTitle: input.title }),
      }),
    })
    const route = RouteModule.compile({
      identifier: "users.detail",
      module: routeModule,
      path: "/users/:userId",
    })

    expect(route.identifier).toBe("users.detail")
    expect(Route.content(route)).toBe("user-screen")
    expect(Route.hasLoader(route)).toBe(true)
    expect(Route.hasAction(route)).toBe(true)
    expect(route.decode.params).toBeDefined()
    expect(route.decode.search).toBeDefined()
    expect(Route.getAction(route)?.input).toBeDefined()
  })

  it("rejects missing component exports and undecorated loader/action exports", () => {
    expect(() => RouteModule.extract({})).toThrowError(RouteErrors.RouteModuleExportError)
    expect(() => RouteModule.extract({ component: "user-screen", loader: { load: () => Promise.resolve("ok") } }))
      .toThrowError(
        RouteErrors.RouteModuleExportError,
      )
    expect(() => RouteModule.extract({ component: "user-screen", action: { handle: () => Promise.resolve("ok") } }))
      .toThrowError(
        RouteErrors.RouteModuleExportError,
      )
  })
})
