---
title: Primeros pasos con Backend
description: Aprende a configurar Effectify en tu aplicación backend de Node.js
---

# Primeros pasos con Backend

Esta guía te ayudará a empezar con Effectify en tu aplicación backend de Node.js. Recorreremos la configuración de dependencias básicas y la creación de tu primer servicio backend impulsado por Effect.

## Requisitos previos

Antes de comenzar, asegúrate de tener:

- Node.js 18 o superior
- Conocimientos básicos de Node.js y TypeScript
- Familiaridad con conceptos de desarrollo backend

## Instalación

Elige los paquetes que necesitas para tu proyecto:

### Paquete de autenticación principal

Para autenticación con better-auth y Effect:

```bash
npm install @effectify/node-better-auth better-auth effect
```

### Aplicación de autenticación completa

Para un servicio de autenticación listo para desplegar:

```bash
npm install @effectify/node-auth-app
```

### Dependencias adicionales

Probablemente necesitarás estas dependencias comunes:

```bash
npm install express cors helmet dotenv
npm install -D @types/express @types/cors typescript ts-node nodemon
```

## Configuración básica

### 1. Estructura de proyecto

Crea una estructura de proyecto bien organizada:

```
mi-backend/
├── src/
│   ├── config/
│   │   └── index.ts
│   ├── services/
│   │   ├── auth.ts
│   │   └── user.ts
│   ├── repositories/
│   │   └── user.ts
│   ├── routes/
│   │   └── auth.ts
│   ├── middleware/
│   │   └── auth.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── .env
```

### 2. Configuración de TypeScript

Crea un `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. Configuración de entorno

Crea un archivo `.env`:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
JWT_SECRET=tu-super-secreto-jwt
BETTER_AUTH_SECRET=tu-secreto-better-auth
BETTER_AUTH_URL=http://localhost:3000
```

### 4. Configuración básica del servidor

Crea `src/index.ts`:

```typescript
import express from "express"
import cors from "cors"
import helmet from "helmet"
import { Effect, Layer } from "effect"
import { config } from "./config"
import { authRoutes } from "./routes/auth"

const app = express()

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Rutas
app.use("/auth", authRoutes)

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

// Iniciar servidor
const startServer = Effect.gen(function*() {
  const { port } = yield* config

  return yield* Effect.async<void>((resume) => {
    const server = app.listen(port, () => {
      console.log(`Servidor corriendo en el puerto ${port}`)
      resume(Effect.succeed(void 0))
    })

    server.on("error", (error) => {
      resume(Effect.fail(error))
    })
  })
})

// Ejecutar el servidor
Effect.runPromise(startServer).catch(console.error)
```

## Gestión de configuración

Crea `src/config/index.ts`:

```typescript
import { Context, Effect, Layer } from "effect"

export interface AppConfig {
  readonly port: number
  readonly nodeEnv: string
  readonly database: {
    readonly url: string
  }
  readonly auth: {
    readonly jwtSecret: string
    readonly betterAuthSecret: string
    readonly betterAuthUrl: string
  }
}

export class AppConfigService extends Context.Tag("AppConfigService")<
  AppConfigService,
  AppConfig
>() {}

export const loadConfig = Effect.gen(function*() {
  const port = Number(process.env.PORT) || 3000
  const nodeEnv = process.env.NODE_ENV || "development"

  const databaseUrl = yield* Effect.fromNullable(process.env.DATABASE_URL).pipe(
    Effect.orElseFail(() => new Error("DATABASE_URL is required")),
  )

  const jwtSecret = yield* Effect.fromNullable(process.env.JWT_SECRET).pipe(
    Effect.orElseFail(() => new Error("JWT_SECRET is required")),
  )

  const betterAuthSecret = yield* Effect.fromNullable(process.env.BETTER_AUTH_SECRET).pipe(
    Effect.orElseFail(() => new Error("BETTER_AUTH_SECRET is required")),
  )

  const betterAuthUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000"

  return {
    port,
    nodeEnv,
    database: { url: databaseUrl },
    auth: { jwtSecret, betterAuthSecret, betterAuthUrl },
  } satisfies AppConfig
})

export const AppConfigLive = Layer.effect(AppConfigService, loadConfig)
export const config = AppConfigService
```

## Manejo de errores

Crea `src/types/errors.ts`:

```typescript
import { Data } from "effect"

export class AppError extends Data.TaggedError("AppError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class AuthenticationError extends Data.TaggedError("AuthenticationError")<{
  readonly message: string
}> {}

export class AuthorizationError extends Data.TaggedError("AuthorizationError")<{
  readonly message: string
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly errors: Record<string, string>
}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: string
}> {}

export class UserAlreadyExistsError extends Data.TaggedError("UserAlreadyExistsError")<{
  readonly email: string
}> {}
```
