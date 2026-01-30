import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as NodeHttpServerRequest from "@effect/platform-node/NodeHttpServerRequest"
import type { Auth } from "better-auth"
import { toNodeHandler } from "better-auth/node"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Effect from "effect/Effect"
import { BetterAuthApiError } from "./better-auth-error.js"

const TRAILING_SLASH_REGEX = /\/+$/
const PROTOCOL_REGEX = /(https?:\/\/)+/

export const toEffectHandler: (
  auth:
    | {
      handler: Auth["handler"]
    }
    | Auth["handler"],
) => Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  BetterAuthApiError | ConfigError,
  HttpServerRequest.HttpServerRequest
> = (auth) =>
  Effect.gen(function*() {
    const request = yield* HttpServerRequest.HttpServerRequest
    const nodeRequest = NodeHttpServerRequest.toIncomingMessage(request)
    const nodeResponse = NodeHttpServerRequest.toServerResponse(request)
    const appUrl = yield* Config.url("BETTER_AUTH_URL")
    // Debug: log the configured app URL so we can diagnose Config errors
    yield* Effect.log(`toEffectHandler: BETTER_AUTH_URL=${String(appUrl)}`)

    const normalizeUrl = (url: URL) =>
      url.toString().replace(TRAILING_SLASH_REGEX, "").replace(PROTOCOL_REGEX, "http://")

    const allowedOrigins = [normalizeUrl(appUrl)]
    const origin = nodeRequest.headers.origin ? normalizeUrl(appUrl) : ""

    if (allowedOrigins.includes(origin)) {
      nodeResponse.setHeader("Access-Control-Allow-Origin", nodeRequest.headers.origin || "")
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
    yield* Effect.log(`toEffectHandler: incoming ${nodeRequest.method} ${String(nodeRequest.url)}`)

    try {
      yield* Effect.tryPromise({
        try: () =>
          "handler" in auth
            ? toNodeHandler(auth.handler)(nodeRequest, nodeResponse)
            : toNodeHandler(auth)(nodeRequest, nodeResponse),
        catch: (cause) => new BetterAuthApiError({ cause }),
      })

      // Log the response status after the handler completes
      yield* Effect.log(
        `toEffectHandler: completed ${nodeRequest.method} ${String(nodeRequest.url)} -> ${nodeResponse.statusCode}`,
      )
    } catch (err) {
      // Ensure we log errors from the underlying handler for debugging
      yield* Effect.log(
        `toEffectHandler: error handling ${nodeRequest.method} ${String(nodeRequest.url)}: ${String(err)}`,
      )

      try {
        // Try to return the error to the client as JSON to make debugging easier
        nodeResponse.statusCode = 500
        nodeResponse.setHeader("Content-Type", "application/json")
        const payload = JSON.stringify({ error: String(err) })
        nodeResponse.end(payload)
      } catch (writeErr) {
        // If writing the error response fails, log that too
        yield* Effect.log(`toEffectHandler: failed to write error response: ${String(writeErr)}`)
      }

      return HttpServerResponse.empty({ status: 500 })
    }

    return HttpServerResponse.empty({ status: nodeResponse.writableFinished ? nodeResponse.statusCode : 499 })
  })
