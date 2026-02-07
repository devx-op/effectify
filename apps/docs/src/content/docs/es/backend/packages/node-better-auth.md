---
title: "@effectify/node-better-auth"
description: Integración de Effect con better-auth para aplicaciones Node.js
---

# @effectify/node-better-auth

El paquete `@effectify/node-better-auth` integra Effect con better-auth para aplicaciones Node.js. Permite usar las capacidades de autenticación de better-auth aprovechando el manejo de errores, componibilidad y seguridad de tipos de Effect.

## Instalación

```bash
npm install @effectify/node-better-auth better-auth effect
```

## Uso básico

### Configurar Better Auth con Effect

```typescript
import { betterAuth } from "better-auth"
import { Effect } from "effect"

export const auth = betterAuth({
  database: { provider: "sqlite", url: process.env.DATABASE_URL || "auth.db" },
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
})

export const AuthService = {
  signUp: (email: string, password: string, name?: string) =>
    Effect.tryPromise({
      try: () => auth.api.signUpEmail({ body: { email, password, name } }),
      catch: (error) => new AuthenticationError("Sign up failed", { cause: error }),
    }),
  signIn: (email: string, password: string) =>
    Effect.tryPromise({
      try: () => auth.api.signInEmail({ body: { email, password } }),
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

### Integración con Express.js

```typescript
import express from "express"
import { Effect } from "effect"
import { auth, AuthService } from "./auth"

const app = express()
app.use(express.json())
app.use("/api/auth", auth.handler)

app.post("/api/register", (req, res) => {
  const { email, password, name } = req.body
  Effect.runPromise(
    AuthService.signUp(email, password, name).pipe(
      Effect.map((result) =>
        res
          .status(201)
          .json({ success: true, user: result.user, session: result.session })
      ),
      Effect.catchTag(
        "AuthenticationError",
        (error) => Effect.sync(() => res.status(400).json({ error: error.message })),
      ),
      Effect.catchAll(() => Effect.sync(() => res.status(500).json({ error: "Internal server error" }))),
    ),
  )
})
```

## Características avanzadas

### Errores personalizados

```typescript
import { Data } from "effect"

export class AuthenticationError extends Data.TaggedError(
  "AuthenticationError",
)<{ readonly message: string; readonly cause?: unknown }> {}
export class AuthorizationError extends Data.TaggedError("AuthorizationError")<{
  readonly message: string
  readonly requiredRole?: string
}> {}
export class SessionExpiredError extends Data.TaggedError(
  "SessionExpiredError",
)<{ readonly sessionId: string }> {}
export class InvalidTokenError extends Data.TaggedError("InvalidTokenError")<{
  readonly token: string
}> {}
```
