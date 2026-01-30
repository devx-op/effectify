---
title: Installation
description: How to install Effectify backend packages in your Node.js project
---

# Installation

This guide covers how to install and configure Effectify backend packages in your Node.js project.

## Package Manager

We recommend using your preferred package manager. All examples use npm, but you can substitute with yarn, pnpm, or bun.

## Core Packages

### @effectify/node-better-auth

Effect integration with better-auth for Node.js:

```bash
npm install @effectify/node-better-auth
```

**Peer Dependencies:**

```bash
npm install better-auth effect @effect/platform @effect/platform-node
```

### @effectify/node-auth-app

Complete authentication server application:

```bash
npm install @effectify/node-auth-app
```

**Peer Dependencies:**

```bash
npm install express cors helmet dotenv better-sqlite3
```

## Framework-Specific Setup

### Express.js

1. Create a new Express project:

```bash
mkdir my-backend && cd my-backend
npm init -y
npm install express cors helmet dotenv
npm install -D @types/express @types/cors @types/node typescript ts-node nodemon
```

2. Initialize TypeScript:

```bash
npx tsc --init
```

3. Configure `tsconfig.json`:

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
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

4. Add scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### Fastify

1. Create a new Fastify project:

```bash
mkdir my-fastify-backend && cd my-fastify-backend
npm init -y
npm install fastify @fastify/cors @fastify/helmet
npm install -D @types/node typescript ts-node nodemon
```

2. Basic Fastify setup with Effect:

```typescript
// src/index.ts
import Fastify from "fastify"
import { Effect } from "effect"

const fastify = Fastify({ logger: true })

// Register plugins
fastify.register(require("@fastify/cors"))
fastify.register(require("@fastify/helmet"))

// Effect-based route
fastify.get("/health", async (request, reply) => {
  const healthCheck = Effect.succeed({
    status: "ok",
    timestamp: new Date().toISOString(),
  })

  const result = await Effect.runPromise(healthCheck)
  return result
})

const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
    console.log("Server running on port 3000")
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
```

### NestJS

1. Create a new NestJS project:

```bash
npm i -g @nestjs/cli
nest new my-nest-backend
cd my-nest-backend
npm install @effectify/node-better-auth effect
```

2. Create an Effect service:

```typescript
// src/effect/effect.service.ts
import { Injectable } from "@nestjs/common"
import { Effect } from "effect"

@Injectable()
export class EffectService {
  runEffect<A, E>(effect: Effect.Effect<A, E, never>): Promise<A> {
    return Effect.runPromise(effect)
  }
}
```

3. Use in controllers:

```typescript
// src/users/users.controller.ts
import { Controller, Get, Param } from "@nestjs/common"
import { EffectService } from "../effect/effect.service"
import { UserService } from "./user.service"

@Controller("users")
export class UsersController {
  constructor(private readonly effectService: EffectService) {}

  @Get(":id")
  async getUser(@Param("id") id: string) {
    return this.effectService.runEffect(
      UserService.getById(id),
    )
  }
}
```

## Database Setup

### PostgreSQL with pg

```bash
npm install pg @types/pg
```

Create database service:

```typescript
// src/services/database.ts
import { Pool } from "pg"
import { Context, Effect, Layer } from "effect"

export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  {
    readonly query: <T>(sql: string, params?: any[]) => Effect.Effect<T[], DatabaseError>
  }
>() {}

const makeDatabaseService = Effect.gen(function*() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  return {
    query: <T>(sql: string, params: any[] = []) =>
      Effect.tryPromise({
        try: () => pool.query(sql, params).then((result) => result.rows as T[]),
        catch: (error) => new DatabaseError("Query failed", { cause: error }),
      }),
  }
})

export const DatabaseServiceLive = Layer.effect(DatabaseService, makeDatabaseService)
```

### SQLite with better-sqlite3

```bash
npm install better-sqlite3 @types/better-sqlite3
```

Create SQLite service:

```typescript
// src/services/sqlite.ts
import Database from "better-sqlite3"
import { Context, Effect, Layer } from "effect"

export class SqliteService extends Context.Tag("SqliteService")<
  SqliteService,
  {
    readonly query: <T>(sql: string, params?: any[]) => Effect.Effect<T[], DatabaseError>
    readonly run: (sql: string, params?: any[]) => Effect.Effect<void, DatabaseError>
  }
>() {}

const makeSqliteService = Effect.gen(function*() {
  const db = new Database(process.env.DATABASE_PATH || "app.db")

  return {
    query: <T>(sql: string, params: any[] = []) =>
      Effect.try({
        try: () => db.prepare(sql).all(...params) as T[],
        catch: (error) => new DatabaseError("Query failed", { cause: error }),
      }),

    run: (sql: string, params: any[] = []) =>
      Effect.try({
        try: () => {
          db.prepare(sql).run(...params)
        },
        catch: (error) => new DatabaseError("Query failed", { cause: error }),
      }),
  }
})

export const SqliteServiceLive = Layer.effect(SqliteService, makeSqliteService)
```

### Prisma Integration

```bash
npm install prisma @prisma/client
npx prisma init
```

Create Prisma service:

```typescript
// src/services/prisma.ts
import { PrismaClient } from "@prisma/client"
import { Context, Effect, Layer } from "effect"

export class PrismaService extends Context.Tag("PrismaService")<
  PrismaService,
  PrismaClient
>() {}

const makePrismaService = Effect.gen(function*() {
  const prisma = new PrismaClient()

  // Connect to database
  yield* Effect.tryPromise({
    try: () => prisma.$connect(),
    catch: (error) => new DatabaseError("Failed to connect to database", { cause: error }),
  })

  return prisma
})

export const PrismaServiceLive = Layer.effect(PrismaService, makePrismaService)
```

## Authentication Setup

### Basic Better Auth Setup

```bash
npm install @effectify/node-better-auth better-auth
```

Create auth configuration:

```typescript
// src/config/auth.ts
import { betterAuth } from "better-auth"
import { Effect } from "effect"

export const authConfig = betterAuth({
  database: {
    provider: "sqlite",
    url: process.env.DATABASE_URL || "app.db",
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
  signUp: (email: string, password: string, name: string) =>
    Effect.tryPromise({
      try: () =>
        authConfig.api.signUpEmail({
          body: { email, password, name },
        }),
      catch: (error) => new AuthenticationError("Sign up failed", { cause: error }),
    }),

  signIn: (email: string, password: string) =>
    Effect.tryPromise({
      try: () =>
        authConfig.api.signInEmail({
          body: { email, password },
        }),
      catch: (error) => new AuthenticationError("Sign in failed", { cause: error }),
    }),

  getSession: (sessionToken: string) =>
    Effect.tryPromise({
      try: () =>
        authConfig.api.getSession({
          headers: { authorization: `Bearer ${sessionToken}` },
        }),
      catch: (error) => new AuthenticationError("Invalid session", { cause: error }),
    }),
}
```

## Environment Configuration

Create `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
# or for SQLite
# DATABASE_URL=file:./app.db

# Authentication
BETTER_AUTH_SECRET=your-super-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret-here

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
```

Load environment variables:

```typescript
// src/config/env.ts
import { config } from "dotenv"
import { Context, Effect } from "effect"

config() // Load .env file

export interface EnvConfig {
  readonly port: number
  readonly nodeEnv: string
  readonly databaseUrl: string
  readonly betterAuthSecret: string
  readonly betterAuthUrl: string
  readonly jwtSecret: string
  readonly corsOrigin: string
  readonly logLevel: string
}

export class EnvService extends Context.Tag("EnvService")<
  EnvService,
  EnvConfig
>() {}

export const loadEnvConfig = Effect.gen(function*() {
  const requiredEnvVars = [
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "JWT_SECRET",
  ]

  // Validate required environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      yield* Effect.fail(new Error(`Missing required environment variable: ${envVar}`))
    }
  }

  return {
    port: Number(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || "development",
    databaseUrl: process.env.DATABASE_URL!,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET!,
    betterAuthUrl: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    jwtSecret: process.env.JWT_SECRET!,
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
    logLevel: process.env.LOG_LEVEL || "info",
  } satisfies EnvConfig
})

export const EnvServiceLive = Layer.effect(EnvService, loadEnvConfig)
```

## Logging Setup

```bash
npm install winston
```

Create logging service:

```typescript
// src/services/logger.ts
import winston from "winston"
import { Context, Effect, Layer } from "effect"

export class LoggerService extends Context.Tag("LoggerService")<
  LoggerService,
  {
    readonly info: (message: string, meta?: any) => Effect.Effect<void>
    readonly error: (message: string, error?: any) => Effect.Effect<void>
    readonly warn: (message: string, meta?: any) => Effect.Effect<void>
    readonly debug: (message: string, meta?: any) => Effect.Effect<void>
  }
>() {}

const makeLoggerService = Effect.gen(function*() {
  const env = yield* EnvService

  const logger = winston.createLogger({
    level: env.logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
    ],
  })

  return {
    info: (message: string, meta?: any) => Effect.sync(() => logger.info(message, meta)),

    error: (message: string, error?: any) => Effect.sync(() => logger.error(message, { error })),

    warn: (message: string, meta?: any) => Effect.sync(() => logger.warn(message, meta)),

    debug: (message: string, meta?: any) => Effect.sync(() => logger.debug(message, meta)),
  }
})

export const LoggerServiceLive = Layer.effect(LoggerService, makeLoggerService)
```

## Verification

Create a test endpoint to verify everything is working:

```typescript
// src/routes/test.ts
import { Router } from "express"
import { Effect } from "effect"
import { DatabaseService } from "../services/database"
import { LoggerService } from "../services/logger"

export const testRoutes = Router()

testRoutes.get("/health", (req, res) => {
  const healthCheck = Effect.gen(function*() {
    const logger = yield* LoggerService

    yield* logger.info("Health check requested")

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    }
  })

  Effect.runPromise(
    healthCheck.pipe(
      Effect.provide(LoggerServiceLive),
      Effect.map((result) => res.json(result)),
      Effect.catchAll((error) => Effect.sync(() => res.status(500).json({ error: "Health check failed" }))),
    ),
  )
})

testRoutes.get("/db-test", (req, res) => {
  const dbTest = Effect.gen(function*() {
    const db = yield* DatabaseService
    const logger = yield* LoggerService

    yield* logger.info("Database test requested")

    // Simple query to test database connection
    const result = yield* db.query("SELECT 1 as test")

    return { database: "connected", result }
  })

  Effect.runPromise(
    dbTest.pipe(
      Effect.provide(Layer.merge(DatabaseServiceLive, LoggerServiceLive)),
      Effect.map((result) => res.json(result)),
      Effect.catchAll((error) => Effect.sync(() => res.status(500).json({ error: "Database test failed" }))),
    ),
  )
})
```

## Next Steps

- [Getting Started Guide](/backend/getting-started/) - Learn the basics
- [Node Better Auth](/backend/packages/node-better-auth/) - Explore authentication
- [Node Auth App](/backend/packages/node-auth-app/) - Complete auth service
- [Backend Reference](/backend/reference/) - API documentation

## Troubleshooting

### Common Issues

1. **TypeScript compilation errors**: Check your `tsconfig.json` configuration
2. **Environment variable errors**: Ensure all required variables are set
3. **Database connection issues**: Verify your database URL and credentials
4. **Effect context errors**: Make sure all services are properly provided with layers

### Getting Help

- [GitHub Issues](https://github.com/devx-op/effectify/issues)
- [Discussions](https://github.com/devx-op/effectify/discussions)
- [Effect Discord](https://discord.gg/effect-ts)
