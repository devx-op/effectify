import { describe, it } from "@effect/vitest"
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import type { Auth } from "better-auth"
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

describe("toEffectHandler", () => {
  it.effect("recovers a rejected Better Auth Node handler with a logged JSON 500 response", () => {
    const logs: Array<string> = []
    const logger = Logger.make(({ message }) => {
      const entry = Array.isArray(message) && message.length === 1 ? message[0] : message
      logs.push(String(entry))
    })
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
      expect(body).toContain("BetterAuthApiError")
      expect(body).toContain(REJECTION_MESSAGE)
      expect(
        logs.some(
          (entry) => entry.includes("toEffectHandler: error handling GET /:") && entry.includes("BetterAuthApiError"),
        ),
      ).toBe(true)
    }).pipe(
      Effect.provide([NodeHttpServer.layerTest, ConfigProvider.layer(ConfigProvider.fromUnknown({ BETTER_AUTH_URL }))]),
      Effect.provideService(Logger.CurrentLoggers, new Set([logger])),
    )
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

  it.effect("preserves a successfully written Better Auth response", () => {
    const authHandler: Auth["handler"] = async () =>
      new Response("authenticated", {
        status: 201,
        headers: { "Content-Type": "text/plain" },
      })

    return Effect.gen(function* () {
      yield* HttpRouter.add("GET", "/", toEffectHandler(authHandler)).pipe(HttpRouter.serve, Layer.build)

      const response = yield* HttpClient.get("/")

      expect(response.status).toBe(201)
      expect(yield* response.text).toBe("authenticated")
    }).pipe(
      Effect.provide([NodeHttpServer.layerTest, ConfigProvider.layer(ConfigProvider.fromUnknown({ BETTER_AUTH_URL }))]),
    )
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
