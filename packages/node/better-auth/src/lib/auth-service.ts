import { betterAuth, type BetterAuthOptions, type Session, type User } from "better-auth"

import * as ServiceMap from "effect/ServiceMap"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Data from "effect/Data"

export namespace AuthService {
  export type AuthInstance = ReturnType<typeof betterAuth>

  /**
   * AuthServiceContext provides access to the better-auth instance.
   *
   * In Effect v4, services are created with ServiceMap.Service and have a .Layer property
   * for easy Layer composition.
   */
  export class AuthServiceContext extends ServiceMap.Service<AuthServiceContext>()(
    "AuthServiceContext",
    {
      make: Effect.gen(function*() {
        // This is a placeholder - the actual implementation is provided via Layer
        return { auth: {} as AuthInstance }
      }),
    },
  ) {
    static layer(options: BetterAuthOptions) {
      return Layer.effect(
        this,
        Effect.gen(function*() {
          // Try to extract database path from Database instance for logging
          const dbPathForLog = options.database &&
              typeof options.database === "object" &&
              "name" in options.database
            ? String(
              (options.database as { name?: string }).name || "unknown",
            )
            : "unknown"
          yield* Effect.logInfo(
            `Creating auth instance with database path: ${dbPathForLog}`,
          )

          const isAdapter = options.database &&
            typeof options.database === "object" &&
            ("createSession" in options.database ||
              "createUser" in options.database ||
              "client" in options.database)

          if (!isAdapter) {
            yield* Effect.logInfo(
              "Auto-migration is disabled in better-auth v1.4.10+. Please run 'better-auth migrate' manually.",
            )
          }

          return { auth: betterAuth(options) }
        }),
      )
    }
  }

  /**
   * AuthContext provides access to the authenticated user and session.
   *
   * This is request-scoped context provided at runtime during request handling.
   */
  export class AuthContext extends ServiceMap.Service<AuthContext>()(
    "AuthContext",
    {
      make: Effect.succeed(
        {} as { readonly user: User; readonly session: Session },
      ),
    },
  ) {}

  // In v4, use Data.TaggedError instead of Schema.TaggedError for simple errors
  export class Unauthorized extends Data.TaggedError("Unauthorized")<{
    readonly details: string
  }> {}
}
