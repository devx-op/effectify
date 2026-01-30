import { HttpApiMiddleware, HttpServerRequest } from "@effect/platform"
import { AuthService } from "@effectify/node-better-auth"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

export class Authorization extends HttpApiMiddleware.Tag<Authorization>()("Authorization", {
  failure: AuthService.Unauthorized,
  provides: AuthService.AuthContext,
}) {}

export const AuthorizationLive = Layer.effect(
  Authorization,
  Effect.gen(function*() {
    const { auth } = yield* AuthService.AuthServiceContext

    return Effect.gen(function*() {
      // Extract headers from HTTP request
      const headers = yield* HttpServerRequest.schemaHeaders(
        Schema.Struct({
          cookie: Schema.optional(Schema.String),
          authorization: Schema.optional(Schema.String),
        }),
      ).pipe(Effect.mapError(() => new AuthService.Unauthorized({ details: "Failed to parse headers" })))

      // Forward to Better Auth
      const forwardedHeaders = new Headers()
      if (headers.cookie) {
        forwardedHeaders.set("cookie", headers.cookie)
      }
      if (headers.authorization) {
        forwardedHeaders.set("authorization", headers.authorization)
      }

      // Get session from Better Auth
      const session = yield* Effect.tryPromise({
        try: () => auth.api.getSession({ headers: forwardedHeaders }),
        catch: (cause) => new AuthService.Unauthorized({ details: String(cause) }),
      })

      if (!session) {
        return yield* Effect.fail(new AuthService.Unauthorized({ details: "Missing or invalid authentication" }))
      }

      // Provide authenticated user context
      return AuthService.AuthContext.of({ user: session.user, session: session.session })
    })
  }),
)
