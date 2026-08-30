import type { Auth } from "better-auth"
import { toNodeHandler } from "better-auth/node"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import { BetterAuthApiError } from "./better-auth-error.js"
import type { ConfigError } from "effect/Config"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as NodeHttpServerRequest from "@effect/platform-node/NodeHttpServerRequest"

type BetterAuthHandler =
  | Auth["handler"]
  | {
      readonly handler: Auth["handler"]
      readonly options?: Pick<Auth["options"], "trustedOrigins">
    }

const canonicalOrigin = (value: string): string | undefined => {
  if (!URL.canParse(value)) return undefined

  const url = new URL(value)
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username !== "" ||
    url.password !== "" ||
    url.hostname.includes("*")
  ) {
    return undefined
  }

  return url.origin
}

export const toEffectHandler: (
  auth: BetterAuthHandler,
) => Effect.Effect<HttpServerResponse.HttpServerResponse, ConfigError, HttpServerRequest.HttpServerRequest> = (auth) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const nodeRequest = NodeHttpServerRequest.toIncomingMessage(request)
    const nodeResponse = NodeHttpServerRequest.toServerResponse(request)
    const appUrl = yield* Config.url("BETTER_AUTH_URL")
    // Debug: log the configured app URL so we can diagnose Config errors
    yield* Effect.log(`toEffectHandler: BETTER_AUTH_URL=${String(appUrl)}`)

    const allowedOrigins = new Set([appUrl.origin])
    const trustedOrigins = typeof auth === "function" ? undefined : auth.options?.trustedOrigins
    if (Array.isArray(trustedOrigins)) {
      for (const trustedOrigin of trustedOrigins) {
        if (typeof trustedOrigin !== "string") continue
        const origin = canonicalOrigin(trustedOrigin)
        if (origin !== undefined) allowedOrigins.add(origin)
      }
    }

    const requestOrigin = nodeRequest.headers.origin
    const origin = requestOrigin === undefined ? undefined : canonicalOrigin(requestOrigin)

    if (origin !== undefined && allowedOrigins.has(origin)) {
      nodeResponse.setHeader("Access-Control-Allow-Origin", origin)
      nodeResponse.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
      nodeResponse.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
      nodeResponse.setHeader("Access-Control-Max-Age", "600")
      nodeResponse.setHeader("Access-Control-Allow-Credentials", "true")
    }

    // Handle preflight requests
    if (nodeRequest.method === "OPTIONS") {
      nodeResponse.statusCode = 200
      nodeResponse.end()
      return HttpServerResponse.empty({ status: 200 })
    }

    // Log incoming request for debugging
    const authHeader = nodeRequest.headers.authorization
    yield* Effect.log(
      `toEffectHandler: incoming ${nodeRequest.method} ${String(nodeRequest.url)} headers: cookie=${
        nodeRequest.headers.cookie ? "present" : "none"
      }, auth=${authHeader ? "present" : "none"}`,
    )

    // If no cookie but has Authorization header (bearer token), set it as cookie for better-auth
    if (!nodeRequest.headers.cookie && authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7) // Remove "Bearer " prefix
      nodeRequest.headers.cookie = `better-auth.session_token=${token}`
      yield* Effect.log(`toEffectHandler: using token from Authorization header as cookie`)
    }

    const handler = typeof auth === "function" ? auth : auth.handler
    return yield* Effect.tryPromise({
      try: () => toNodeHandler(handler)(nodeRequest, nodeResponse),
      catch: (cause) => new BetterAuthApiError({ cause }),
    }).pipe(
      Effect.tap(() =>
        Effect.log(
          `toEffectHandler: completed ${nodeRequest.method} ${String(nodeRequest.url)} -> ${nodeResponse.statusCode}`,
        ),
      ),
      Effect.map(() =>
        HttpServerResponse.empty({
          status: nodeResponse.writableEnded ? nodeResponse.statusCode : 499,
        }),
      ),
      Effect.catchTag("BetterAuthApiError", (error) =>
        Effect.gen(function* () {
          const errorMessage = `${String(error)}: ${String(error.cause)}`
          yield* Effect.log(
            `toEffectHandler: error handling ${nodeRequest.method} ${String(nodeRequest.url)}: ${errorMessage}`,
          )

          if (nodeResponse.headersSent || nodeResponse.writableEnded) {
            if (!nodeResponse.writableEnded) {
              yield* Effect.sync(() => nodeResponse.end())
            }
            return HttpServerResponse.empty({ status: nodeResponse.statusCode })
          }

          return HttpServerResponse.jsonUnsafe({ error: "Internal Server Error" }, { status: 500 })
        }),
      ),
    )
  })
