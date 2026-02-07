---
title: Primeros pasos con Paquetes Universales
description: Aprende los conceptos y patrones usados en todos los paquetes
---

# Primeros pasos con Paquetes Universales

Los paquetes universales de Effectify son la base para construir aplicaciones consistentes y seguras por tipos en React, SolidJS y Node.js. Esta guía explica los conceptos y patrones clave.

## Conceptos clave

### 1. Diseño centrado en Effect

- Componibilidad
- Seguridad de tipos
- Testeabilidad
- Fiabilidad

```typescript
import { Effect } from "effect"

const greetUser = (name: string) => Effect.succeed(`Hola, ${name}!`)

const processUser = (userId: string) =>
  Effect.gen(function*() {
    const user = yield* fetchUser(userId)
    const greeting = yield* greetUser(user.name)
    const result = yield* saveGreeting(greeting)
    return result
  })
```

### 2. Diseño dirigido por dominio

```typescript
interface User {
  readonly id: UserId
  readonly email: Email
  readonly name: UserName
  readonly createdAt: Date
}

const UserDomain = {
  create: (data: CreateUserData) => Effect<User, ValidationError>,
  validate: (user: User) => Effect<User, ValidationError>,
  updateProfile: (user: User, updates: UserUpdates) => Effect<User, ValidationError>,
}

class UserCreatedEvent {
  readonly _tag = "UserCreatedEvent"
  constructor(readonly user: User, readonly timestamp: Date) {}
}
```

### 3. Inversión de dependencias

```typescript
export interface UserRepository {
  readonly save: (user: User) => Effect<User, RepositoryError>
  readonly findById: (id: UserId) => Effect<User | null, RepositoryError>
  readonly findByEmail: (email: Email) => Effect<User | null, RepositoryError>
}
```

## Patrones de tipos

### Tipos con marca

```typescript
export type UserId = string & { readonly _brand: "UserId" }
export type Email = string & { readonly _brand: "Email" }
export type UserName = string & { readonly _brand: "UserName" }
```

Constructores:

```typescript
export const UserId = {
  make: (value: string): Effect<UserId, ValidationError> =>
    value.length > 0 && value.length <= 50
      ? Effect.succeed(value as UserId)
      : Effect.fail(new ValidationError("Invalid user ID", { field: "userId" })),
}

export const Email = {
  make: (value: string): Effect<Email, ValidationError> =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? Effect.succeed(value as Email)
      : Effect.fail(new ValidationError("Invalid email format", { field: "email" })),
}
```

### Validación con Schema

```typescript
import { Schema } from "@effect/schema"

export const UserSchema = Schema.struct({
  id: Schema.string,
  email: Schema.string.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  name: Schema.string.pipe(Schema.minLength(1), Schema.maxLength(100)),
  createdAt: Schema.Date,
})
```

## Manejo de errores

```typescript
import { Data } from "effect"

export class DomainError
  extends Data.TaggedError("DomainError")<{ readonly message: string; readonly cause?: unknown }>
{}
export class ValidationError
  extends Data.TaggedError("ValidationError")<{ readonly field: string; readonly message: string }>
{}
export class BusinessRuleViolationError
  extends Data.TaggedError("BusinessRuleViolationError")<{ readonly rule: string; readonly message: string }>
{}
export class ResourceNotFoundError
  extends Data.TaggedError("ResourceNotFoundError")<{ readonly resource: string; readonly id: string }>
{}
```
