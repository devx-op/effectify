import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type BetterAuthOptions, betterAuth, type Session, type User } from 'better-auth'
// import { getMigrations } from 'better-auth/db'
import Database from 'better-sqlite3'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'

export type AuthInstance = ReturnType<typeof betterAuth>

// Get the directory of the current file to ensure we use the correct database path
// auth.server.ts is in app/lib/, so we need to go up one level to reach app/ root where sqlite.db is located
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// From app/lib/ to app/ root where sqlite.db is located
const dbPath = join(__dirname, '../sqlite.db')

const authOptions = {
  baseURL: 'http://localhost:3000',
  secret: 'hola',
  emailAndPassword: {
    enabled: true,
  },
  database: new Database(dbPath) as unknown,

  advanced: {
    // Ensure cookies work in development
    defaultCookieAttributes: {
      sameSite: 'lax' as const,
      secure: false, // Allow cookies over http in development
      path: '/', // Ensure cookies are available for all routes
    },
    // Configure session token cookie explicitly
    cookies: {
      session_token: {
        attributes: {
          sameSite: 'lax' as const,
          secure: false,
          path: '/',
        },
      },
    },
  },
} satisfies BetterAuthOptions

const auth = betterAuth(authOptions)
const makeAuth = Effect.gen(function* () {
  //const { runMigrations } = yield* Effect.promise(() => getMigrations(authOptions))
  //yield* Effect.promise(runMigrations)
  yield* Effect.logInfo(`Creating auth instance with database path: ${dbPath}`)
  return auth
})

export class AuthService extends Effect.Service<AuthService>()('Auth', {
  effect: makeAuth,
  dependencies: [],
}) {}

export class AuthContext extends Context.Tag('AuthContext')<
  AuthContext,
  { readonly user: User; readonly session: Session }
>() {}

export class Unauthorized extends Schema.TaggedError<Unauthorized>()('Unauthorized', { details: Schema.String }) {}
