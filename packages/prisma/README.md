# @effectify/prisma

A powerful Prisma generator that creates **Effect** services and layers from your Prisma schema, enabling seamless integration of Prisma with the Effect ecosystem.

## 🚀 Features

- **Effect-Native Services**: Auto-generated Effect services for all your Prisma models.
- **Dependency Injection**: Ready-to-use Layers for easy testing and production setup.
- **Type-Safe Error Handling**: All Prisma errors are mapped to typed Effect errors (e.g., `PrismaUniqueConstraintError`).
- **Transaction Support**: Native Effect integration for Prisma transactions.
- **Schema Validation**: Integration with `@effect/schema` for runtime validation.

## 📦 Installation

```bash
pnpm add -D @effectify/prisma prisma-effect-kysely
pnpm add effect @prisma/client
```

## 🛠️ Configuration

Add the generator to your `schema.prisma` file:

```prisma
generator client {
  provider = "prisma-client-js"
}

generator effect_schemas {
  provider = "prisma-effect-kysely"
  output   = "./generated/effect/schemas"
}

generator effect {
  provider = "effect-prisma"
  output   = "./generated/effect"
}

datasource db {
  provider = "sqlite" // or postgresql, mysql, etc.
  url      = env("DATABASE_URL")
}
```

## ⚙️ Usage

### 1. Generate the Code

Run the Prisma generator to create your Effect services:

```bash
pnpm prisma generate
```

### 2. Use the Generated Services

The generator creates a `Prisma` service for transactions and raw queries, and Model classes that you can use to create repositories.

```typescript
import { Effect, Layer } from "effect"
import { Prisma, UserModel } from "./generated/effect/index.js"
import * as PrismaRepository from "./generated/effect/prisma-repository.js"

// Define a program using the generated Prisma service
const program = Effect.gen(function*() {
  // Create a repository for the User model
  const userRepo = yield* PrismaRepository.make(UserModel, {
    modelName: "user",
    spanPrefix: "User"
  })

  // Create a new user
  const newUser = yield* userRepo.create({
    data: {
      email: "hello@effect.website",
      name: "Effect User"
    }
  })

  // Find the user
  const user = yield* userRepo.findUnique({
    where: { id: newUser.id }
  })

  return user
})

// Provide the Prisma layer
const MainLayer = Prisma.layer({
  // Prisma Client options
  log: ["query", "info", "warn", "error"]
})

// Run the program
Effect.runPromise(program.pipe(Effect.provide(MainLayer)))
```

## 🧪 Testing

The generated layers make testing easy by allowing you to provide alternative implementations or test databases.

```typescript
import { it } from "@effect/vitest"
import { Effect } from "effect"
import { Prisma, UserModel } from "./generated/effect/index.js"
import * as PrismaRepository from "./generated/effect/prisma-repository.js"

it.effect("should create a user", () =>
  Effect.gen(function*() {
    const userRepo = yield* PrismaRepository.make(UserModel, {
      modelName: "user",
      spanPrefix: "User"
    })

    const user = yield* userRepo.create({
      data: { email: "test@example.com" }
    })

    expect(user.email).toBe("test@example.com")
  }).pipe(
    Effect.provide(Prisma.layer()) // In tests, you might want to use a specific test DB url
  ))
```

## ⚠️ Error Handling

All Prisma errors are mapped to specific tagged errors in Effect, allowing you to handle them precisely.

```typescript
import { Effect } from "effect"
import { Prisma, UserModel } from "./generated/effect/index.js"
import * as PrismaRepository from "./generated/effect/prisma-repository.js"

const createUser = (email: string) =>
  Effect.gen(function*() {
    const userRepo = yield* PrismaRepository.make(UserModel, {
      modelName: "user",
      spanPrefix: "User"
    })

    return yield* userRepo.create({
      data: { email }
    })
  }).pipe(
    Effect.catchTag(
      "PrismaUniqueConstraintError",
      (error) => Effect.logError(`User with email ${email} already exists`)
    )
  )
```

## 📝 License

MIT
