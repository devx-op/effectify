---
title: "@effectify/node-better-auth"
description: Effect integration with better-auth for Node.js applications
---

# @effectify/node-better-auth

The `@effectify/node-better-auth` package provides seamless integration between Effect and better-auth for Node.js applications. It enables you to use better-auth's powerful authentication features while leveraging Effect's error handling, composability, and type safety.

## Installation

```bash
npm install @effectify/node-better-auth better-auth effect
```

## Basic Usage

### Setting up Better Auth with Effect

```typescript
import { betterAuth } from "better-auth"
import { Effect } from "effect"

// Configure better-auth
export const auth = betterAuth({
  database: {
    provider: "sqlite",
    url: process.env.DATABASE_URL || "auth.db",
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
})

// Effect wrapper for auth operations
export const AuthService = {
  signUp: (email: string, password: string, name?: string) =>
    Effect.tryPromise({
      try: () =>
        auth.api.signUpEmail({
          body: { email, password, name },
        }),
      catch: (error) => new AuthenticationError("Sign up failed", { cause: error }),
    }),

  signIn: (email: string, password: string) =>
    Effect.tryPromise({
      try: () =>
        auth.api.signInEmail({
          body: { email, password },
        }),
      catch: (error) => new AuthenticationError("Sign in failed", { cause: error }),
    }),

  signOut: (sessionToken: string) =>
    Effect.tryPromise({
      try: () =>
        auth.api.signOut({
          headers: { authorization: `Bearer ${sessionToken}` },
        }),
      catch: (error) => new AuthenticationError("Sign out failed", { cause: error }),
    }),
}
```

### Express.js Integration

```typescript
import express from "express"
import { Effect } from "effect"
import { auth, AuthService } from "./auth"

const app = express()
app.use(express.json())

// Mount better-auth API routes
app.use("/api/auth", auth.handler)

// Custom registration endpoint with Effect
app.post("/api/register", (req, res) => {
  const { email, password, name } = req.body

  Effect.runPromise(
    AuthService.signUp(email, password, name).pipe(
      Effect.map((result) =>
        res.status(201).json({
          success: true,
          user: result.user,
          session: result.session,
        })
      ),
      Effect.catchTag("AuthenticationError", (error) =>
        Effect.sync(() =>
          res.status(400).json({
            error: error.message,
          })
        )),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          console.error("Registration error:", error)
          res.status(500).json({ error: "Internal server error" })
        })
      ),
    ),
  )
})

// Custom login endpoint with Effect
app.post("/api/login", (req, res) => {
  const { email, password } = req.body

  Effect.runPromise(
    AuthService.signIn(email, password).pipe(
      Effect.map((result) =>
        res.json({
          success: true,
          user: result.user,
          session: result.session,
        })
      ),
      Effect.catchTag("AuthenticationError", (error) =>
        Effect.sync(() =>
          res.status(401).json({
            error: "Invalid credentials",
          })
        )),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          console.error("Login error:", error)
          res.status(500).json({ error: "Internal server error" })
        })
      ),
    ),
  )
})
```

## Advanced Features

### Custom Error Types

```typescript
import { Data } from "effect"

// Define authentication-specific errors
export class AuthenticationError extends Data.TaggedError("AuthenticationError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class AuthorizationError extends Data.TaggedError("AuthorizationError")<{
  readonly message: string
  readonly requiredRole?: string
}> {}

export class SessionExpiredError extends Data.TaggedError("SessionExpiredError")<{
  readonly sessionId: string
}> {}

export class InvalidTokenError extends Data.TaggedError("InvalidTokenError")<{
  readonly token: string
}> {}
```

### Session Management with Effect

```typescript
import { Context, Effect } from "effect"

// Session service interface
export class SessionService extends Context.Tag("SessionService")<
  SessionService,
  {
    readonly getSession: (token: string) => Effect.Effect<Session, SessionExpiredError | InvalidTokenError>
    readonly validateSession: (sessionId: string) => Effect.Effect<boolean, never>
    readonly refreshSession: (sessionId: string) => Effect.Effect<Session, SessionExpiredError>
    readonly revokeSession: (sessionId: string) => Effect.Effect<void, never>
  }
>() {}

// Implementation using better-auth
const makeSessionService = Effect.gen(function*() {
  return {
    getSession: (token: string) =>
      Effect.tryPromise({
        try: async () => {
          const session = await auth.api.getSession({
            headers: { authorization: `Bearer ${token}` },
          })

          if (!session) {
            throw new InvalidTokenError({ token })
          }

          if (session.expiresAt < new Date()) {
            throw new SessionExpiredError({ sessionId: session.id })
          }

          return session
        },
        catch: (error) => {
          if (error instanceof InvalidTokenError || error instanceof SessionExpiredError) {
            return error
          }
          return new InvalidTokenError({ token })
        },
      }),

    validateSession: (sessionId: string) =>
      Effect.gen(function*() {
        try {
          const session = yield* Effect.tryPromise({
            try: () => auth.api.getSession({ body: { sessionId } }),
            catch: () => false,
          })
          return !!session && session.expiresAt > new Date()
        } catch {
          return false
        }
      }),

    refreshSession: (sessionId: string) =>
      Effect.tryPromise({
        try: () => auth.api.updateSession({ body: { sessionId } }),
        catch: () => new SessionExpiredError({ sessionId }),
      }),

    revokeSession: (sessionId: string) =>
      Effect.tryPromise({
        try: () => auth.api.revokeSession({ body: { sessionId } }),
        catch: () => void 0,
      }).pipe(Effect.map(() => void 0)),
  }
})

export const SessionServiceLive = Layer.effect(SessionService, makeSessionService)
```

### Authentication Middleware

```typescript
import { NextFunction, Request, Response } from "express"

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User
      session?: Session
    }
  }
}

// Effect-based authentication middleware
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace("Bearer ", "")

  if (!token) {
    return res.status(401).json({ error: "No token provided" })
  }

  const authenticateRequest = Effect.gen(function*() {
    const sessionService = yield* SessionService
    const session = yield* sessionService.getSession(token)

    // Attach user and session to request
    req.user = session.user
    req.session = session

    return void 0
  })

  Effect.runPromise(
    authenticateRequest.pipe(
      Effect.provide(SessionServiceLive),
      Effect.map(() => next()),
      Effect.catchTag("InvalidTokenError", () => Effect.sync(() => res.status(401).json({ error: "Invalid token" }))),
      Effect.catchTag(
        "SessionExpiredError",
        () => Effect.sync(() => res.status(401).json({ error: "Session expired" })),
      ),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          console.error("Auth middleware error:", error)
          res.status(500).json({ error: "Authentication failed" })
        })
      ),
    ),
  )
}

// Role-based authorization middleware
export const requireRole = (requiredRole: string) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" })
  }

  const checkRole = Effect.gen(function*() {
    const user = req.user!

    if (!user.role || user.role !== requiredRole) {
      yield* Effect.fail(
        new AuthorizationError({
          message: `Required role: ${requiredRole}`,
          requiredRole,
        }),
      )
    }

    return void 0
  })

  Effect.runPromise(
    checkRole.pipe(
      Effect.map(() => next()),
      Effect.catchTag(
        "AuthorizationError",
        (error) => Effect.sync(() => res.status(403).json({ error: error.message })),
      ),
    ),
  )
}
```

### User Management Service

```typescript
export class UserService extends Context.Tag("UserService")<
  UserService,
  {
    readonly createUser: (data: CreateUserData) => Effect.Effect<User, ValidationError | UserAlreadyExistsError>
    readonly getUserById: (id: string) => Effect.Effect<User, UserNotFoundError>
    readonly getUserByEmail: (email: string) => Effect.Effect<User, UserNotFoundError>
    readonly updateUser: (id: string, data: UpdateUserData) => Effect.Effect<User, UserNotFoundError | ValidationError>
    readonly deleteUser: (id: string) => Effect.Effect<void, UserNotFoundError>
    readonly changePassword: (
      id: string,
      oldPassword: string,
      newPassword: string,
    ) => Effect.Effect<void, AuthenticationError | ValidationError>
  }
>() {}

const makeUserService = Effect.gen(function*() {
  return {
    createUser: (data: CreateUserData) =>
      Effect.gen(function*() {
        // Validate input
        const validation = yield* validateCreateUserData(data)

        // Check if user already exists
        const existingUser = yield* Effect.tryPromise({
          try: () => auth.api.getUser({ body: { email: validation.email } }),
          catch: () => null,
        })

        if (existingUser) {
          yield* Effect.fail(new UserAlreadyExistsError({ email: validation.email }))
        }

        // Create user through better-auth
        const result = yield* Effect.tryPromise({
          try: () =>
            auth.api.signUpEmail({
              body: {
                email: validation.email,
                password: validation.password,
                name: validation.name,
              },
            }),
          catch: (error) =>
            new ValidationError({
              errors: { general: "Failed to create user" },
            }),
        })

        return result.user
      }),

    getUserById: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const user = await auth.api.getUser({ body: { id } })
          if (!user) {
            throw new UserNotFoundError({ userId: id })
          }
          return user
        },
        catch: (error) => {
          if (error instanceof UserNotFoundError) return error
          return new UserNotFoundError({ userId: id })
        },
      }),

    changePassword: (id: string, oldPassword: string, newPassword: string) =>
      Effect.gen(function*() {
        // Validate new password
        if (newPassword.length < 8) {
          yield* Effect.fail(
            new ValidationError({
              errors: { password: "Password must be at least 8 characters" },
            }),
          )
        }

        // Get user
        const user = yield* Effect.tryPromise({
          try: () => auth.api.getUser({ body: { id } }),
          catch: () => new UserNotFoundError({ userId: id }),
        })

        // Verify old password
        const isValidOldPassword = yield* Effect.tryPromise({
          try: () =>
            auth.api.signInEmail({
              body: { email: user.email, password: oldPassword },
            }),
          catch: () => new AuthenticationError({ message: "Invalid current password" }),
        })

        // Update password
        yield* Effect.tryPromise({
          try: () =>
            auth.api.changePassword({
              body: {
                currentPassword: oldPassword,
                newPassword: newPassword,
              },
              headers: { authorization: `Bearer ${isValidOldPassword.session.token}` },
            }),
          catch: (error) =>
            new ValidationError({
              errors: { password: "Failed to update password" },
            }),
        })
      }),
  }
})

export const UserServiceLive = Layer.effect(UserService, makeUserService)
```

## Database Integration

### PostgreSQL Setup

```typescript
import { betterAuth } from "better-auth"
import { pg } from "better-auth/adapters/pg"

export const auth = betterAuth({
  database: pg({
    connectionString: process.env.DATABASE_URL!,
  }),
  // ... other config
})
```

### SQLite Setup

```typescript
import { betterAuth } from "better-auth"
import { sqlite } from "better-auth/adapters/sqlite"

export const auth = betterAuth({
  database: sqlite({
    url: process.env.DATABASE_URL || "auth.db",
  }),
  // ... other config
})
```

## Social Authentication

```typescript
import { betterAuth } from "better-auth"

export const auth = betterAuth({
  // ... database config
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
})

// Effect wrapper for social auth
export const SocialAuthService = {
  githubSignIn: (code: string) =>
    Effect.tryPromise({
      try: () =>
        auth.api.signInSocial({
          body: { provider: "github", code },
        }),
      catch: (error) => new AuthenticationError("GitHub sign in failed", { cause: error }),
    }),

  googleSignIn: (code: string) =>
    Effect.tryPromise({
      try: () =>
        auth.api.signInSocial({
          body: { provider: "google", code },
        }),
      catch: (error) => new AuthenticationError("Google sign in failed", { cause: error }),
    }),
}
```

## Testing

```typescript
import { Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"

// Mock auth service for testing
const MockAuthService = Layer.succeed(AuthService, {
  signUp: (email: string, password: string, name?: string) =>
    email === "existing@example.com"
      ? Effect.fail(new AuthenticationError({ message: "User already exists" }))
      : Effect.succeed({
        user: { id: "test-id", email, name: name || "Test User" },
        session: { id: "session-id", token: "test-token" },
      }),

  signIn: (email: string, password: string) =>
    email === "valid@example.com" && password === "password123"
      ? Effect.succeed({
        user: { id: "test-id", email, name: "Test User" },
        session: { id: "session-id", token: "test-token" },
      })
      : Effect.fail(new AuthenticationError({ message: "Invalid credentials" })),
})

describe("AuthService", () => {
  it("should sign up a new user", async () => {
    const result = await Effect.runPromise(
      AuthService.signUp("new@example.com", "password123", "New User").pipe(
        Effect.provide(MockAuthService),
      ),
    )

    expect(result.user.email).toBe("new@example.com")
    expect(result.user.name).toBe("New User")
  })

  it("should fail to sign up existing user", async () => {
    const result = Effect.runPromise(
      AuthService.signUp("existing@example.com", "password123").pipe(
        Effect.provide(MockAuthService),
        Effect.flip,
      ),
    )

    await expect(result).resolves.toBeInstanceOf(AuthenticationError)
  })
})
```

## Best Practices

### 1. Use Proper Error Types

Define specific error types for different authentication scenarios:

```typescript
class WeakPasswordError extends Data.TaggedError("WeakPasswordError")<{
  readonly requirements: string[]
}> {}

class AccountLockedError extends Data.TaggedError("AccountLockedError")<{
  readonly unlockTime: Date
}> {}
```

### 2. Implement Rate Limiting

```typescript
const rateLimitedSignIn = (email: string, password: string) =>
  Effect.gen(function*() {
    // Check rate limit
    const rateLimitService = yield* RateLimitService
    const isAllowed = yield* rateLimitService.checkLimit(`signin:${email}`, 5, 300) // 5 attempts per 5 minutes

    if (!isAllowed) {
      yield* Effect.fail(new RateLimitExceededError({ email }))
    }

    // Attempt sign in
    const result = yield* AuthService.signIn(email, password)

    // Reset rate limit on success
    yield* rateLimitService.resetLimit(`signin:${email}`)

    return result
  })
```

### 3. Secure Session Management

```typescript
const secureSessionConfig = {
  session: {
    expiresIn: 60 * 60 * 2, // 2 hours
    updateAge: 60 * 15, // Update every 15 minutes
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
    },
  },
}
```

## Examples

Check out the complete implementation in:

- [Node Auth App](https://github.com/devx-op/effectify/tree/main/apps/node-auth-app)

## API Reference

### AuthService Methods

- `signUp(email, password, name?)` - Register a new user
- `signIn(email, password)` - Authenticate user
- `signOut(sessionToken)` - Sign out user
- `getSession(token)` - Get session information
- `refreshSession(sessionId)` - Refresh session
- `changePassword(userId, oldPassword, newPassword)` - Change user password

### Error Types

- `AuthenticationError` - Authentication failures
- `AuthorizationError` - Authorization failures
- `SessionExpiredError` - Expired sessions
- `InvalidTokenError` - Invalid tokens
- `UserNotFoundError` - User not found
- `UserAlreadyExistsError` - User already exists
