import { describe, it } from "@effect/vitest"
import { betterAuth } from "better-auth"
import Database from "better-sqlite3"
import { Effect } from "effect"
import { assert, expect } from "vitest"
import { AuthService } from "../src/lib/auth-service.js"

describe("AuthService", () => {
  const testDb = new Database(":memory:")
  const authOptions = {
    database: testDb,
    emailAndPassword: {
      enabled: true,
    },
  }

  // Helper to run migrations
  const runMigrations = async () => {
    // We need to initialize betterAuth to register the schema/plugins internally if needed,
    // even if we don't use the instance directly here.
    // However, getMigrations takes options directly.
    // If betterAuth(authOptions) is strictly required for side effects:
    betterAuth(authOptions)
    const { runMigrations: run } = await import("better-auth/db").then((m) => m.getMigrations(authOptions))
    await run()
  }

  const AuthLayer = AuthService.layer(authOptions)

  it.effect("should create the layer and provide the service", () =>
    Effect.gen(function*() {
      const { auth } = yield* AuthService.AuthServiceContext
      assert.ok(auth)
      assert.ok(auth.api)
      assert.ok(auth.handler)
    }).pipe(Effect.provide(AuthLayer)))

  it.effect("should handle session verification simulation", () =>
    Effect.gen(function*() {
      const { auth } = yield* AuthService.AuthServiceContext
      expect(!!auth).toBe(true)
    }).pipe(Effect.provide(AuthLayer)))

  it.effect("should create user and login", () =>
    Effect.gen(function*() {
      // Run migrations before testing DB operations
      yield* Effect.promise(() => runMigrations())

      const { auth } = yield* AuthService.AuthServiceContext

      // 1. Create User
      const testUser = {
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      }

      const user = yield* Effect.promise(() =>
        auth.api.signUpEmail({
          body: testUser,
        })
      )

      assert.ok(user)
      expect(user.user.email).toBe(testUser.email)

      // 2. Login
      const session = yield* Effect.promise(() =>
        auth.api.signInEmail({
          body: {
            email: testUser.email,
            password: testUser.password,
          },
        })
      )

      assert.ok(session)
      expect(session.user.email).toBe(testUser.email)
    }).pipe(Effect.provide(AuthLayer)))
})
