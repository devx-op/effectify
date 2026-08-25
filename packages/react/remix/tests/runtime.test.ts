import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import { describe, expect, it } from "vitest"
import { ActionArgsContext, LoaderArgsContext } from "../src/lib/context.js"
import { HttpResponseFailure, HttpResponseRedirect, HttpResponseSuccess } from "../src/lib/http-response.js"
import { make } from "../src/lib/runtime.js"

const loaderArgs = (): LoaderFunctionArgs => ({
  context: {},
  params: { routeId: "private" },
  pattern: "/private",
  request: new Request("https://effectify.dev/private"),
  url: new URL("https://effectify.dev/private"),
})

const actionArgs = (): ActionFunctionArgs => ({
  context: {},
  params: { routeId: "todos" },
  pattern: "/todos",
  request: new Request("https://effectify.dev/todos", { method: "POST" }),
  url: new URL("https://effectify.dev/todos"),
})

const runtimeWithLogs = () => {
  const logs: unknown[] = []
  const logger = Logger.make((entry) => {
    logs.push(entry)
  })
  return { logs, runtime: make(Logger.layer([logger])) }
}

describe("Remix bridge runtime contracts", () => {
  it("injects the exact loader and action arguments and keeps success shapes serializable", async () => {
    const runtime = make(Layer.empty)
    const loaderInput = loaderArgs()
    const actionInput = actionArgs()
    const loader = runtime.withLoaderEffect(
      Effect.gen(function* () {
        const args = yield* LoaderArgsContext
        return new HttpResponseSuccess({
          data: {
            request: args.request === loaderInput.request,
            routeId: args.params.routeId,
          },
        })
      }),
    )
    const action = runtime.withActionEffect(
      Effect.gen(function* () {
        const args = yield* ActionArgsContext
        return new HttpResponseSuccess({
          data: {
            method: args.request.method,
            request: args.request === actionInput.request,
          },
        })
      }),
    )

    await expect(loader(loaderInput)).resolves.toEqual({
      ok: true,
      data: { request: true, routeId: "private" },
    })
    await expect(action(actionInput)).resolves.toEqual({
      ok: true,
      response: { method: "POST", request: true },
    })
  })

  it("returns redirect Responses from loaders and actions with status and headers", async () => {
    const runtime = make(Layer.empty)
    const redirectInit = {
      headers: { "Set-Cookie": "session=expired", "X-Bridge": "remix" },
      status: 307,
    }
    const loader = runtime.withLoaderEffect(
      Effect.succeed(new HttpResponseRedirect({ to: "/login", init: redirectInit })),
    )
    const action = runtime.withActionEffect(
      Effect.succeed(new HttpResponseRedirect({ to: "/login", init: redirectInit })),
    )

    const results = [await loader(loaderArgs()), await action(actionArgs())]
    expect(results).toHaveLength(2)
    for (const result of results) {
      expect(result).toBeInstanceOf(Response)
      if (!(result instanceof Response)) throw new Error("expected redirect Response")
      expect(result.status).toBe(307)
      expect(result.headers.get("location")).toBe("/login")
      expect(result.headers.get("set-cookie")).toBe("session=expired")
      expect(result.headers.get("x-bridge")).toBe("remix")
    }
  })

  it("triangulates redirect status and custom headers independently for loader and action", async () => {
    const runtime = make(Layer.empty)
    const loader = runtime.withLoaderEffect(
      Effect.succeed(
        new HttpResponseRedirect({
          to: "/loader-login",
          init: { headers: { "X-Bridge-Path": "loader" }, status: 308 },
        }),
      ),
    )
    const action = runtime.withActionEffect(
      Effect.succeed(
        new HttpResponseRedirect({
          to: "/action-login",
          init: { headers: { "X-Bridge-Path": "action" }, status: 303 },
        }),
      ),
    )

    const loaderResult = await loader(loaderArgs())
    const actionResult = await action(actionArgs())
    expect(loaderResult).toBeInstanceOf(Response)
    expect(actionResult).toBeInstanceOf(Response)
    if (!(loaderResult instanceof Response) || !(actionResult instanceof Response)) {
      throw new Error("expected redirect Responses")
    }
    expect([
      loaderResult.status,
      loaderResult.headers.get("location"),
      loaderResult.headers.get("x-bridge-path"),
    ]).toEqual([308, "/loader-login", "loader"])
    expect([
      actionResult.status,
      actionResult.headers.get("location"),
      actionResult.headers.get("x-bridge-path"),
    ]).toEqual([303, "/action-login", "action"])
  })

  it("triangulates exact throwable identity across both runtime paths", async () => {
    const runtime = make(Layer.empty)
    const loaderResponse = new Response("loader denied", { status: 403 })
    const actionResponse = new Response("action denied", { status: 409 })
    const loaderError = new TypeError("loader identity")
    const actionError = new RangeError("action identity")

    await expect(runtime.withLoaderEffect(Effect.fail(loaderResponse))(loaderArgs())).rejects.toBe(loaderResponse)
    await expect(runtime.withActionEffect(Effect.fail(actionResponse))(actionArgs())).rejects.toBe(actionResponse)
    await expect(runtime.withLoaderEffect(Effect.fail(loaderError))(loaderArgs())).rejects.toBe(loaderError)
    await expect(runtime.withActionEffect(Effect.fail(actionError))(actionArgs())).rejects.toBe(actionError)
  })

  it("throws modeled loader failures as explicit status-500 JSON Responses", async () => {
    const loader = make(Layer.empty).withLoaderEffect(Effect.succeed(new HttpResponseFailure({ cause: "unavailable" })))

    await loader(loaderArgs()).then(
      () => {
        throw new Error("expected loader failure Response")
      },
      async (error: unknown) => {
        if (!(error instanceof Response)) throw error
        expect(error.status).toBe(500)
        expect(error.headers.get("content-type")).toContain("application/json")
        expect(await error.json()).toEqual({ ok: false, errors: ["unavailable"] })
      },
    )
  })

  it("returns modeled action failures as explicit status-400 JSON Responses", async () => {
    const action = make(Layer.empty).withActionEffect(Effect.succeed(new HttpResponseFailure({ cause: "invalid" })))

    const result = await action(actionArgs())
    expect(result).toBeInstanceOf(Response)
    if (!(result instanceof Response)) throw new Error("expected action failure Response")
    expect(result.status).toBe(400)
    expect(result.headers.get("content-type")).toContain("application/json")
    await expect(result.json()).resolves.toEqual({ ok: false, errors: ["invalid"] })
  })

  it("preserves successful raw Response handling and failed Response identity", async () => {
    const runtime = make(Layer.empty)
    const successful = new Response("created", {
      status: 201,
      headers: { "Set-Cookie": "created=yes" },
    })
    const failed = new Response("denied", {
      status: 401,
      headers: { "Set-Cookie": "session=expired" },
    })

    await expect(runtime.withActionEffect(Effect.succeed(successful))(actionArgs())).rejects.toBe(successful)
    await expect(runtime.withLoaderEffect(Effect.fail(failed))(loaderArgs())).rejects.toBe(failed)
    await expect(runtime.withActionEffect(Effect.fail(failed))(actionArgs())).rejects.toBe(failed)
    expect(successful.headers.get("set-cookie")).toBe("created=yes")
    expect(failed.headers.get("set-cookie")).toBe("session=expired")
  })

  it("preserves failed Error identity for loader and action ErrorBoundary handling", async () => {
    const runtime = make(Layer.empty)
    const loaderError = new Error("loader failed")
    const actionError = new Error("action failed")

    await expect(runtime.withLoaderEffect(Effect.fail(loaderError))(loaderArgs())).rejects.toBe(loaderError)
    await expect(runtime.withActionEffect(Effect.fail(actionError))(actionArgs())).rejects.toBe(actionError)
  })

  it("logs loader defects and interruptions before returning generic status-500 JSON", async () => {
    const { logs, runtime } = runtimeWithLogs()

    for (const effect of [Effect.die(new Error("loader defect")), Effect.interrupt]) {
      await runtime
        .withLoaderEffect(effect)(loaderArgs())
        .then(
          () => {
            throw new Error("expected loader failure Response")
          },
          async (error: unknown) => {
            if (!(error instanceof Response)) throw error
            expect(error.status).toBe(500)
            expect(await error.json()).toEqual({
              ok: false,
              errors: ["Internal server error"],
            })
          },
        )
    }

    expect(logs).toHaveLength(2)
  })

  it("logs action defects and interruptions before returning generic status-400 JSON", async () => {
    const { logs, runtime } = runtimeWithLogs()

    for (const effect of [Effect.die(new Error("action defect")), Effect.interrupt]) {
      const result = await runtime.withActionEffect(effect)(actionArgs())
      expect(result).toBeInstanceOf(Response)
      if (!(result instanceof Response)) throw new Error("expected action failure Response")
      expect(result.status).toBe(400)
      await expect(result.json()).resolves.toEqual({
        ok: false,
        errors: ["Internal server error"],
      })
    }

    expect(logs).toHaveLength(2)
  })
})
