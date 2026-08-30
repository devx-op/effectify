import { describe, it } from "@effect/vitest"
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import { betterAuth, type Auth } from "better-auth"
import { ServerResponse } from "node:http"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as Ref from "effect/Ref"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { expect } from "vitest"
import { toEffectHandler } from "../src/lib/handler.js"

const BETTER_AUTH_URL = "http://localhost:3000"
const REJECTION_MESSAGE = "wrapped auth handler rejected"

const captureLogs = () => {
  const logs: Array<string> = []
  const logger = Logger.make(({ message }) => {
    const entry = Array.isArray(message) && message.length === 1 ? message[0] : message
    logs.push(String(entry))
  })
  return { logger, logs }
}

const serverLayers = (betterAuthUrl = BETTER_AUTH_URL) => [
  NodeHttpServer.layerTest,
  ConfigProvider.layer(ConfigProvider.fromUnknown({ BETTER_AUTH_URL: betterAuthUrl })),
]

describe("toEffectHandler", () => {
  it.effect("recovers a rejected Better Auth Node handler with a logged JSON 500 response", () => {
    const { logger, logs } = captureLogs()
    const authHandler: Auth["handler"] = async () => {
      throw new Error(REJECTION_MESSAGE)
    }

    return Effect.gen(function* () {
      const outcome = yield* Ref.make<"pending" | "failure" | "success">("pending")
      const app = Effect.result(toEffectHandler(authHandler)).pipe(
        Effect.flatMap((result) => {
          if (result._tag === "Failure") {
            return Ref.set(outcome, "failure").pipe(
              Effect.as(HttpServerResponse.text("handler effect failed", { status: 599 })),
            )
          }
          return Ref.set(outcome, "success").pipe(Effect.as(result.success))
        }),
      )

      yield* HttpRouter.add("GET", "/", app).pipe(HttpRouter.serve, Layer.build)

      const response = yield* HttpClient.get("/")
      const body = yield* response.text

      expect(yield* Ref.get(outcome)).toBe("success")
      expect(response.status).toBe(500)
      expect(response.headers["content-type"]).toContain("application/json")
      expect(body).toBe('{"error":"Internal Server Error"}')
      expect(body).not.toContain("BetterAuthApiError")
      expect(body).not.toContain(REJECTION_MESSAGE)
      expect(
        logs.some(
          (entry) =>
            entry.includes("toEffectHandler: error handling GET /:") &&
            entry.includes("BetterAuthApiError") &&
            entry.includes(REJECTION_MESSAGE),
        ),
      ).toBe(true)
    }).pipe(
      Effect.provide([NodeHttpServer.layerTest, ConfigProvider.layer(ConfigProvider.fromUnknown({ BETTER_AUTH_URL }))]),
      Effect.provideService(Logger.CurrentLoggers, new Set([logger])),
    )
  })

  it.effect("allows the configured Better Auth origin without rewriting its scheme", () => {
    const authHandler: Auth["handler"] = async () => new Response(null, { status: 204 })

    return Effect.gen(function* () {
      yield* HttpRouter.add("GET", "/", toEffectHandler(authHandler)).pipe(HttpRouter.serve, Layer.build)

      const response = yield* HttpClient.get("/", { headers: { Origin: BETTER_AUTH_URL } })

      expect(response.headers["access-control-allow-origin"]).toBe(BETTER_AUTH_URL)
      expect(response.headers["access-control-allow-credentials"]).toBe("true")
    }).pipe(Effect.provide(serverLayers()))
  })

  it.effect("does not emit Access-Control-Allow-Origin for a foreign origin", () => {
    const authHandler: Auth["handler"] = async () => new Response(null, { status: 204 })

    return Effect.gen(function* () {
      yield* HttpRouter.add("GET", "/", toEffectHandler(authHandler)).pipe(HttpRouter.serve, Layer.build)

      const response = yield* HttpClient.get("/", { headers: { Origin: "https://foreign.example" } })

      expect(response.headers["access-control-allow-origin"]).toBeUndefined()
    }).pipe(Effect.provide(serverLayers()))
  })

  it.effect("does not treat HTTP and HTTPS origins as equivalent", () => {
    const authHandler: Auth["handler"] = async () => new Response(null, { status: 204 })

    return Effect.gen(function* () {
      yield* HttpRouter.add("GET", "/", toEffectHandler(authHandler)).pipe(HttpRouter.serve, Layer.build)

      const response = yield* HttpClient.get("/", { headers: { Origin: "https://localhost:3000" } })

      expect(response.headers["access-control-allow-origin"]).toBeUndefined()
    }).pipe(Effect.provide(serverLayers()))
  })

  it.effect("rejects null and malformed origins", () => {
    const authHandler: Auth["handler"] = async () => new Response(null, { status: 204 })

    return Effect.gen(function* () {
      yield* HttpRouter.add("GET", "/", toEffectHandler(authHandler)).pipe(HttpRouter.serve, Layer.build)

      for (const origin of ["null", "://malformed"]) {
        const response = yield* HttpClient.get("/", { headers: { Origin: origin } })
        expect(response.headers["access-control-allow-origin"]).toBeUndefined()
      }
    }).pipe(Effect.provide(serverLayers()))
  })

  it.effect("allows static trusted origins from a full Better Auth object without wildcard matching", () => {
    const auth = betterAuth({
      baseURL: BETTER_AUTH_URL,
      secret: "test-secret-for-static-trusted-origin-coverage",
      trustedOrigins: ["https://trusted.example", "https://*.wildcard.example"],
    })

    return Effect.gen(function* () {
      yield* HttpRouter.add("GET", "/", toEffectHandler(auth)).pipe(HttpRouter.serve, Layer.build)

      const trustedResponse = yield* HttpClient.get("/", { headers: { Origin: "https://trusted.example" } })
      const wildcardResponse = yield* HttpClient.get("/", { headers: { Origin: "https://tenant.wildcard.example" } })

      expect(trustedResponse.headers["access-control-allow-origin"]).toBe("https://trusted.example")
      expect(wildcardResponse.headers["access-control-allow-origin"]).toBeUndefined()
    }).pipe(Effect.provide(serverLayers()))
  })

  it.effect("does not execute dynamic trusted origin callbacks", () => {
    let callbackInvoked = false
    const authHandler: Auth["handler"] = async () => new Response(null, { status: 204 })
    const auth = {
      handler: authHandler,
      options: {
        trustedOrigins: () => {
          callbackInvoked = true
          return ["https://dynamic.example"]
        },
      },
    }

    return Effect.gen(function* () {
      yield* HttpRouter.add("GET", "/", toEffectHandler(auth)).pipe(HttpRouter.serve, Layer.build)

      const response = yield* HttpClient.get("/", { headers: { Origin: "https://dynamic.example" } })

      expect(callbackInvoked).toBe(false)
      expect(response.headers["access-control-allow-origin"]).toBeUndefined()
    }).pipe(Effect.provide(serverLayers()))
  })

  it.effect("logs cookie and Authorization credentials only as presence markers", () => {
    const { logger, logs } = captureLogs()
    const cookieCredential = "cookie-secret-value"
    const authorizationCredential = "authorization-secret-value"
    const authHandler: Auth["handler"] = async () => new Response(null, { status: 204 })

    return Effect.gen(function* () {
      yield* HttpRouter.add("GET", "/", toEffectHandler(authHandler)).pipe(HttpRouter.serve, Layer.build)

      yield* HttpClient.get("/", {
        headers: {
          Cookie: `session=${cookieCredential}`,
          Authorization: `Bearer ${authorizationCredential}`,
        },
      })

      const output = logs.join("\n")
      expect(output).toContain("headers: cookie=present, auth=present")
      expect(output).not.toContain(cookieCredential)
      expect(output).not.toContain(authorizationCredential)
    }).pipe(Effect.provide(serverLayers()), Effect.provideService(Logger.CurrentLoggers, new Set([logger])))
  })

  it.effect("ends a committed Node response when the wrapped handler rejects", () => {
    let committedResponse: ServerResponse | undefined
    let postCommitHeaderWrites = 0
    const originalSetHeader = ServerResponse.prototype.setHeader
    const originalWriteHead = ServerResponse.prototype.writeHead
    const authHandler: Auth["handler"] = async () =>
      new Response(null, {
        status: 202,
        headers: {
          "Content-Type": "text/plain",
          "X-Effectify-Commit-Then-Reject": "true",
        },
      })

    return Effect.gen(function* () {
      yield* Effect.sync(() => {
        ServerResponse.prototype.setHeader = function (name, value) {
          if (this === committedResponse && this.headersSent) {
            postCommitHeaderWrites += 1
          }
          return originalSetHeader.call(this, name, value)
        }
        ServerResponse.prototype.writeHead = function (this: ServerResponse, ...args: ReadonlyArray<unknown>) {
          if (this.getHeader("x-effectify-commit-then-reject") === "true") {
            // oxlint-disable-next-line typescript/no-this-alias -- Capture the exact committed response for recovery assertions.
            committedResponse = this
            Reflect.apply(originalWriteHead, this, args)
            throw new Error(REJECTION_MESSAGE)
          }
          return Reflect.apply(originalWriteHead, this, args) as ServerResponse
        } as ServerResponse["writeHead"]
      })

      const outcome = yield* Ref.make<"pending" | "failure" | "success">("pending")
      const app = Effect.result(toEffectHandler(authHandler)).pipe(
        Effect.flatMap((result) => {
          if (result._tag === "Failure") {
            return Ref.set(outcome, "failure").pipe(
              Effect.as(HttpServerResponse.text("handler effect failed", { status: 599 })),
            )
          }
          return Ref.set(outcome, "success").pipe(Effect.as(result.success))
        }),
      )

      yield* HttpRouter.add("GET", "/", app).pipe(HttpRouter.serve, Layer.build)

      const response = yield* HttpClient.get("/")
      const body = yield* response.text

      expect(yield* Ref.get(outcome)).toBe("success")
      expect(committedResponse?.headersSent).toBe(true)
      expect(committedResponse?.writableEnded).toBe(true)
      expect(postCommitHeaderWrites).toBe(0)
      expect(response.status).toBe(202)
      expect(response.headers["content-type"]).toContain("text/plain")
      expect(body).toBe("")
    }).pipe(
      Effect.provide([NodeHttpServer.layerTest, ConfigProvider.layer(ConfigProvider.fromUnknown({ BETTER_AUTH_URL }))]),
      Effect.ensuring(
        Effect.sync(() => {
          ServerResponse.prototype.setHeader = originalSetHeader
          ServerResponse.prototype.writeHead = originalWriteHead
        }),
      ),
    )
  })

  it.effect("returns the delegated response status after the Node response has logically ended", () => {
    const authHandler: Auth["handler"] = async () =>
      new Response("authenticated", {
        status: 201,
        headers: { "Content-Type": "text/plain" },
      })

    return Effect.gen(function* () {
      const returnedStatus = yield* Ref.make<number | undefined>(undefined)
      const app = toEffectHandler(authHandler).pipe(Effect.tap((response) => Ref.set(returnedStatus, response.status)))
      yield* HttpRouter.add("GET", "/", app).pipe(HttpRouter.serve, Layer.build)

      const response = yield* HttpClient.get("/")

      expect(yield* Ref.get(returnedStatus)).toBe(201)
      expect(response.status).toBe(201)
      expect(yield* response.text).toBe("authenticated")
    }).pipe(Effect.provide(serverLayers()))
  })

  it.effect("preserves invalid BETTER_AUTH_URL failures in the ConfigError channel", () => {
    let handlerInvoked = false
    const authHandler: Auth["handler"] = async () => {
      handlerInvoked = true
      return new Response()
    }

    return Effect.gen(function* () {
      const failureTag = yield* Ref.make<string | undefined>(undefined)
      const app = Effect.result(toEffectHandler(authHandler)).pipe(
        Effect.flatMap((result) => {
          if (result._tag === "Failure") {
            return Ref.set(failureTag, result.failure._tag).pipe(Effect.as(HttpServerResponse.empty({ status: 598 })))
          }
          return Effect.succeed(result.success)
        }),
      )

      yield* HttpRouter.add("GET", "/", app).pipe(HttpRouter.serve, Layer.build)

      const response = yield* HttpClient.get("/")

      expect(response.status).toBe(598)
      expect(yield* Ref.get(failureTag)).toBe("ConfigError")
      expect(handlerInvoked).toBe(false)
    }).pipe(
      Effect.provide([
        NodeHttpServer.layerTest,
        ConfigProvider.layer(ConfigProvider.fromUnknown({ BETTER_AUTH_URL: "not a URL" })),
      ]),
    )
  })
})
