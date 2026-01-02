import { type BetterAuthOptions, betterAuth, type Session, type User } from 'better-auth'

import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'

export namespace AuthService {
  export type AuthInstance = ReturnType<typeof betterAuth>

  export class AuthServiceContext extends Context.Tag('AuthServiceContext')<
    AuthServiceContext,
    { readonly auth: AuthInstance }
  >() {}

  export const layer = (options: BetterAuthOptions) =>
    Layer.effect(
      AuthServiceContext,
      Effect.gen(function* () {
        // Try to extract database path from Database instance for logging
        const dbPathForLog =
          options.database && typeof options.database === 'object' && 'name' in options.database
            ? String((options.database as { name?: string }).name || 'unknown')
            : 'unknown'
        yield* Effect.logInfo(`Creating auth instance with database path: ${dbPathForLog}`)

        const isAdapter =
          options.database &&
          typeof options.database === 'object' &&
          ('createSession' in options.database || 'createUser' in options.database || 'client' in options.database)

        if (!isAdapter) {
          yield* Effect.logInfo(
            "Auto-migration is disabled in better-auth v1.4.10+. Please run 'better-auth migrate' manually.",
          )
        }

        return { auth: betterAuth(options) }
      }),
    )

  export class AuthContext extends Context.Tag('AuthContext')<
    AuthContext,
    { readonly user: User; readonly session: Session }
  >() {}

  export class Unauthorized extends Schema.TaggedError<Unauthorized>()('Unauthorized', { details: Schema.String }) {}
}
