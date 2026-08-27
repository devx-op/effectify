import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import { RouterContextProvider } from "react-router"
import { describe, expect, it } from "vitest"
import { HttpResponseFailure, HttpResponseRedirect, HttpResponseSuccess } from "../src/lib/http-response.js"
import { make } from "../src/lib/runtime.js"

const loaderArgs = () => ({
  context: new RouterContextProvider(),
  params: {},
  request: new Request("https://effectify.dev/private"),
  url: new URL("https://effectify.dev/private"),
  pattern: "/private",
})

const actionArgs = () => ({
  context: new RouterContextProvider(),
  params: {},
  request: new Request("https://effectify.dev/todos", { method: "POST" }),
  url: new URL("https://effectify.dev/todos"),
  pattern: "/todos",
})

const runtimeWithLogs = () => {
  const logs: unknown[] = []
  const logger = Logger.make((entry) => {
    logs.push(entry)
  })
  return { logs, runtime: make(Logger.layer([logger])) }
}

describe("React Router runtime migration contracts", () => {
  it("keeps normal loader and action payloads serializable", async () => {
    const runtime = make(Layer.empty)
    const loader = runtime.withLoaderEffect(Effect.succeed(new HttpResponseSuccess({ data: { id: "loader" } })))
    const action = runtime.withActionEffect(Effect.succeed(new HttpResponseSuccess({ data: { id: "action" } })))

    await expect(loader(loaderArgs())).resolves.toEqual({
      ok: true,
      data: { id: "loader" },
    })
    await expect(action(actionArgs())).resolves.toEqual({
      ok: true,
      response: { id: "action" },
    })
  })

  it("returns the redirect Response from loaders and actions with metadata", async () => {
    const runtime = make(Layer.empty)
    const redirectInit = {
      headers: { "Set-Cookie": "session=expired" },
      status: 307,
    }
    const loader = runtime.withLoaderEffect(
      Effect.succeed(new HttpResponseRedirect({ to: "/login", init: redirectInit })),
    )
    const action = runtime.withActionEffect(
      Effect.succeed(new HttpResponseRedirect({ to: "/login", init: redirectInit })),
    )

    for (const result of [await loader(loaderArgs()), await action(actionArgs())]) {
      expect(result).toBeInstanceOf(Response)
      if (!(result instanceof Response)) {
        throw new Error("expected redirect Response")
      }
      expect(result.status).toBe(307)
      expect(result.headers.get("location")).toBe("/login")
      expect(result.headers.get("set-cookie")).toBe("session=expired")
    }
  })

  it("keeps loader failure status and JSON body explicit", async () => {
    const runtime = make(Layer.empty)
    const loader = runtime.withLoaderEffect(Effect.succeed(new HttpResponseFailure({ cause: "unavailable" })))

    await expect(loader(loaderArgs())).rejects.toMatchObject({ status: 500 })
    await expect(loader(loaderArgs())).rejects.toMatchObject({
      status: 500,
      headers: expect.any(Headers),
    })
    try {
      await loader(loaderArgs())
    } catch (error) {
      if (!(error instanceof Response)) throw error
      expect(await error.json()).toEqual({
        ok: false,
        errors: ["unavailable"],
      })
    }
  })

  it("uses a decodable Response for action failures that need an HTTP status", async () => {
    const runtime = make(Layer.empty)
    const action = runtime.withActionEffect(Effect.succeed(new HttpResponseFailure({ cause: "invalid" })))

    const result = await action(actionArgs())
    expect(result).toBeInstanceOf(Response)
    if (!(result instanceof Response)) {
      throw new Error("expected action failure Response")
    }
    expect(result.status).toBe(400)
    await expect(result.json()).resolves.toEqual({
      ok: false,
      errors: ["invalid"],
    })
  })

  it("preserves raw successful and failed Response identities with headers", async () => {
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

  it("reports loader defects and interruptions before the generic 500 contract", async () => {
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

  it("reports action defects and interruptions before the generic 400 contract", async () => {
    const { logs, runtime } = runtimeWithLogs()

    for (const effect of [Effect.die(new Error("action defect")), Effect.interrupt]) {
      const result = await runtime.withActionEffect(effect)(actionArgs())
      expect(result).toBeInstanceOf(Response)
      if (!(result instanceof Response)) {
        throw new Error("expected action failure Response")
      }
      expect(result.status).toBe(400)
      await expect(result.json()).resolves.toEqual({
        ok: false,
        errors: ["Internal server error"],
      })
    }

    expect(logs).toHaveLength(2)
  })
})
