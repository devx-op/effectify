import { AuthService } from "@effectify/node-better-auth"
import { Runtime } from "@effectify/react-router"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { RouterContextProvider, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

const authLayer = AuthService.AuthServiceContext.layer({
  baseURL: "https://example.test",
  secret: "test-secret-for-auth-route-evidence",
})
const auth = await Effect.runPromise(AuthService.AuthServiceContext.pipe(Effect.provide(authLayer)))
const handler = vi.spyOn(auth.auth, "handler")

vi.doMock("../../app/lib/runtime.server.js", () => Runtime.make(Layer.succeed(AuthService.AuthServiceContext, auth)))

const { action, loader } = await import("../../app/routes/api.auth.js")

const loaderArgs = (request: Request): LoaderFunctionArgs => ({
  context: new RouterContextProvider(),
  params: { "*": "session" },
  pattern: "/api/auth/*",
  request,
  url: new URL(request.url),
})

const actionArgs = (request: Request): ActionFunctionArgs => ({
  context: new RouterContextProvider(),
  params: { "*": "sign-in/email" },
  pattern: "/api/auth/*",
  request,
  url: new URL(request.url),
})

const authResponse = () => {
  const headers = new Headers({
    Location: "/account",
    "X-Auth-Trace": "trace-123",
  })
  headers.append("Set-Cookie", "session=one; Path=/; HttpOnly")
  headers.append("Set-Cookie", "csrf=two; Path=/; SameSite=Lax")
  return new Response("authenticated response body", {
    status: 307,
    headers,
  })
}

const observedResponse = async (run: Promise<unknown>) => {
  const observed = await run.catch((error) => error)
  expect(observed).toBeInstanceOf(Response)
  if (!(observed instanceof Response)) throw new Error("Expected auth Response")
  return observed
}

const expectResponseFidelity = async (observed: Response, expected: Response) => {
  expect(observed).toBe(expected)
  expect(observed.status).toBe(307)
  expect(observed.headers.get("Location")).toBe("/account")
  expect(observed.headers.get("X-Auth-Trace")).toBe("trace-123")
  expect(observed.headers.getSetCookie()).toEqual(["session=one; Path=/; HttpOnly", "csrf=two; Path=/; SameSite=Lax"])
  await expect(observed.text()).resolves.toBe("authenticated response body")
}

beforeEach(() => {
  handler.mockReset()
})

describe("/api/auth/*", () => {
  it("passes the exact loader request through the app and package handlers with full response fidelity", async () => {
    const request = new Request("https://example.test/api/auth/session", {
      headers: { "X-Request-Trace": "loader-456" },
    })
    const response = authResponse()
    handler.mockResolvedValue(response)

    const observed = await observedResponse(loader(loaderArgs(request)))

    expect(handler).toHaveBeenCalledOnce()
    expect(handler.mock.calls[0]?.[0]).toBe(request)
    expect(handler.mock.calls[0]?.[0].headers.get("X-Request-Trace")).toBe("loader-456")
    await expectResponseFidelity(observed, response)
  })

  it("preserves the exact action request body and all response metadata", async () => {
    const requestBody = JSON.stringify({
      email: "auth@example.test",
      password: "correct horse battery staple",
    })
    const request = new Request("https://example.test/api/auth/sign-in/email?callbackURL=%2Faccount", {
      method: "POST",
      body: requestBody,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Trace": "action-789",
      },
    })
    const response = authResponse()
    handler.mockResolvedValue(response)

    const observed = await observedResponse(action(actionArgs(request)))

    expect(handler).toHaveBeenCalledOnce()
    const forwarded = handler.mock.calls[0]?.[0]
    expect(forwarded).toBe(request)
    expect(forwarded?.method).toBe("POST")
    expect(forwarded?.url).toBe(request.url)
    expect(forwarded?.headers.get("Content-Type")).toBe("application/json")
    expect(forwarded?.headers.get("X-Request-Trace")).toBe("action-789")
    await expect(forwarded?.clone().text()).resolves.toBe(requestBody)
    await expectResponseFidelity(observed, response)
  })
})
