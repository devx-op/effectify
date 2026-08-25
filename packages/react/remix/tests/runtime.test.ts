import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node"
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
  request: new Request("https://effectify.dev/private"),
})

const actionArgs = (): ActionFunctionArgs => ({
  context: {},
  params: { routeId: "todos" },
  request: new Request("https://effectify.dev/todos", { method: "POST" }),
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
