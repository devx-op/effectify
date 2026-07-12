import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import { AuthService } from "@effectify/node-better-auth"
import { ActionArgsContext, LoaderArgsContext } from "@effectify/react-router"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { betterAuthAction, betterAuthLoader } from "../src/lib/handlers.js"

const handlersUrl = new URL("../src/lib/handlers.ts", import.meta.url)
const request = new Request("http://example.test/api/auth/unknown")
const authLayer = AuthService.AuthServiceContext.layer({
  baseURL: "http://example.test",
})

const executeLoader = () =>
  Effect.runPromise(
    betterAuthLoader.pipe(
      Effect.provide(Layer.succeed(LoaderArgsContext, { request, params: {} })),
      Effect.provide(authLayer),
    ),
  )

const executeAction = () =>
  Effect.runPromise(
    betterAuthAction.pipe(
      Effect.provide(Layer.succeed(ActionArgsContext, { request, params: {} })),
      Effect.provide(authLayer),
    ),
  )

describe("Better Auth handler migration contracts", () => {
  it("forwards the router request through the loader handler", async () => {
    const response = await executeLoader()

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(404)
  })

  it("forwards the router request through the action handler", async () => {
    const response = await executeAction()

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(404)
  })

  it("keeps the unsafe request access as the exact WU3-owned RED", async () => {
    const source = await readFile(handlersUrl, "utf8")

    expect(source).not.toContain("as any")
    expect(source).toContain("return ctx.request")
  })
})
