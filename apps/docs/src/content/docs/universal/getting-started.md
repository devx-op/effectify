---
title: Getting Started with Universal Packages
description: Learn the core concepts and patterns used across all Effectify packages
---

# Getting Started with Universal Packages

Universal packages in Effectify provide the foundation for building consistent, type-safe applications across React, SolidJS, and Node.js. This guide will help you understand the core concepts and patterns that make this possible.

## Core Concepts

### 1. Effect-First Design

All universal packages are built with Effect as the primary abstraction. Effect provides:

- **Composability**: Operations can be combined and transformed
- **Type Safety**: Precise error types and return values
- **Testability**: Easy mocking and testing
- **Reliability**: Built-in error handling and retry mechanisms

```typescript
import { Effect } from "effect"

// Simple Effect operation
const greetUser = (name: string) => Effect.succeed(`Hello, ${name}!`)

// Composable operations
const processUser = (userId: string) =>
  Effect.gen(function*() {
    const user = yield* fetchUser(userId)
    const greeting = yield* greetUser(user.name)
    const result = yield* saveGreeting(greeting)

    return result
  })
```

### 2. Domain-Driven Design

Universal packages follow domain-driven design principles, separating business logic from infrastructure concerns:

```typescript
// Domain entities - pure data structures
interface User {
  readonly id: UserId
  readonly email: Email
  readonly name: UserName
  readonly createdAt: Date
}

// Domain services - business logic
const UserDomain = {
  create: (data: CreateUserData) => Effect<User, ValidationError>,
  validate: (user: User) => Effect<User, ValidationError>,
  updateProfile: (user: User, updates: UserUpdates) => Effect<User, ValidationError>,
}

// Domain events - things that happened
class UserCreatedEvent {
  readonly _tag = "UserCreatedEvent"
  constructor(readonly user: User, readonly timestamp: Date) {}
}
```

### 3. Dependency Inversion

Universal packages define interfaces that infrastructure implements:

```typescript
// Domain interface (universal)
export interface UserRepository {
  readonly save: (user: User) => Effect<User, RepositoryError>
  readonly findById: (id: UserId) => Effect<User | null, RepositoryError>
  readonly findByEmail: (email: Email) => Effect<User | null, RepositoryError>
}

// Infrastructure implementations (platform-specific)
export const SqliteUserRepository: UserRepository = {
  save: (user) =>
    Effect.tryPromise({
      try: () => db.insert(users).values(user).returning(),
      catch: (error) => new RepositoryError("Failed to save user", { cause: error }),
    }),
  // ... other methods
}

export const PostgresUserRepository: UserRepository = {
  save: (user) =>
    Effect.tryPromise({
      try: () => pool.query("INSERT INTO users ...", [user]),
      catch: (error) => new RepositoryError("Failed to save user", { cause: error }),
    }),
  // ... other methods
}
```

## Type Safety Patterns

### Branded Types

Universal packages use branded types to prevent mixing up similar values:

```typescript
// Define branded types
export type UserId = string & { readonly _brand: "UserId" }
export type Email = string & { readonly _brand: "Email" }
export type UserName = string & { readonly _brand: "UserName" }

// Smart constructors with validation
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

// Usage
const createUser = (id: string, email: string, name: string) =>
  Effect.gen(function*() {
    const userId = yield* UserId.make(id)
    const userEmail = yield* Email.make(email)
    const userName = yield* UserName.make(name)

    return {
      id: userId,
      email: userEmail,
      name: userName,
      createdAt: new Date(),
    }
  })
```

### Schema Validation

Universal packages provide schema validation using Effect Schema:

```typescript
import { Schema } from "@effect/schema"

// Define schemas for domain objects
export const UserSchema = Schema.struct({
  id: Schema.string,
  email: Schema.string.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  name: Schema.string.pipe(Schema.minLength(1), Schema.maxLength(100)),
  createdAt: Schema.Date,
})

// Validation functions
export const validateUser = (data: unknown) => Schema.parse(UserSchema)(data)

export const encodeUser = Schema.encode(UserSchema)
export const decodeUser = Schema.decode(UserSchema)

// Usage in domain logic
const processUserData = (rawData: unknown) =>
  Effect.gen(function*() {
    const user = yield* validateUser(rawData)
    const processed = yield* UserDomain.processUser(user)

    return processed
  })
```

## Error Handling

### Domain-Specific Errors

Universal packages define clear error hierarchies:

```typescript
import { Data } from "effect"

// Base domain error
export class DomainError extends Data.TaggedError("DomainError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

// Specific domain errors
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string
  readonly message: string
}> {}

export class BusinessRuleViolationError extends Data.TaggedError("BusinessRuleViolationError")<{
  readonly rule: string
  readonly message: string
}> {}

export class ResourceNotFoundError extends Data.TaggedError("ResourceNotFoundError")<{
  readonly resource: string
  readonly id: string
}> {}

export class RepositoryError extends Data.TaggedError("RepositoryError")<{
  readonly message: string
  readonly cause?: unknown
}> {}
```

### Error Recovery Strategies

Universal packages provide error recovery patterns:

```typescript
// Retry with backoff
export const saveUserWithRetry = (user: User) =>
  UserRepository.save(user).pipe(
    Effect.retry({
      times: 3,
      delay: (attempt) => `${attempt * 1000}ms`,
    }),
    Effect.catchTag("RepositoryError", (error) =>
      Effect.gen(function*() {
        yield* Logger.error("Failed to save user after retries", { error })
        return yield* Effect.fail(
          new BusinessRuleViolationError({
            rule: "user-persistence",
            message: "Unable to save user data",
          }),
        )
      })),
  )

// Fallback strategies
export const getUserWithFallback = (id: UserId) =>
  UserRepository.findById(id).pipe(
    Effect.catchTag("RepositoryError", () => CacheRepository.findById(id)),
    Effect.catchAll(() => Effect.succeed(null)),
  )

// Circuit breaker pattern
export const getUserWithCircuitBreaker = (id: UserId) =>
  UserRepository.findById(id).pipe(
    Effect.timeout("5 seconds"),
    Effect.retry({ times: 2 }),
    Effect.catchAll((error) =>
      Effect.gen(function*() {
        yield* CircuitBreaker.recordFailure()
        return yield* Effect.fail(error)
      })
    ),
  )
```

## Service Patterns

### Context and Dependency Injection

Universal packages use Effect's context system for dependency injection:

```typescript
import { Context, Layer } from "effect"

// Define service interfaces
export class Logger extends Context.Tag("Logger")<
  Logger,
  {
    readonly info: (message: string, meta?: any) => Effect<void>
    readonly error: (message: string, meta?: any) => Effect<void>
    readonly debug: (message: string, meta?: any) => Effect<void>
  }
>() {}

export class EventBus extends Context.Tag("EventBus")<
  EventBus,
  {
    readonly publish: <T>(event: T) => Effect<void>
    readonly subscribe: <T>(handler: (event: T) => Effect<void>) => Effect<void>
  }
>() {}

// Use services in domain logic
const createUserWithLogging = (userData: CreateUserData) =>
  Effect.gen(function*() {
    const logger = yield* Logger
    const eventBus = yield* EventBus

    yield* logger.info("Creating user", { email: userData.email })

    const user = yield* UserDomain.create(userData)

    yield* eventBus.publish(new UserCreatedEvent(user, new Date()))
    yield* logger.info("User created successfully", { userId: user.id })

    return user
  })

// Provide implementations
const ConsoleLogger = Layer.succeed(Logger, {
  info: (message, meta) => Effect.sync(() => console.log(message, meta)),
  error: (message, meta) => Effect.sync(() => console.error(message, meta)),
  debug: (message, meta) => Effect.sync(() => console.debug(message, meta)),
})

const InMemoryEventBus = Layer.succeed(EventBus, {
  publish: (event) => Effect.sync(() => console.log("Event:", event)),
  subscribe: (handler) => Effect.succeed(void 0),
})

// Run with dependencies
const program = createUserWithLogging({
  email: "user@example.com",
  name: "John Doe",
  password: "secure123",
}).pipe(
  Effect.provide(Layer.merge(ConsoleLogger, InMemoryEventBus)),
)

await Effect.runPromise(program)
```

## Testing Patterns

### Mock Services

Universal packages are designed for easy testing with mock services:

```typescript
import { Effect, Layer, TestContext } from "effect"

// Mock implementations for testing
const MockUserRepository = Layer.succeed(UserRepository, {
  save: (user) => Effect.succeed(user),
  findById: (id) =>
    id === "existing-user" as UserId
      ? Effect.succeed({ id, email: "test@example.com" as Email, name: "Test User" as UserName, createdAt: new Date() })
      : Effect.succeed(null),
  findByEmail: (email) => Effect.succeed(null),
})

const MockLogger = Layer.succeed(Logger, {
  info: (message, meta) => Effect.succeed(void 0),
  error: (message, meta) => Effect.succeed(void 0),
  debug: (message, meta) => Effect.succeed(void 0),
})

// Test domain logic
const testCreateUser = Effect.gen(function*() {
  const result = yield* createUserWithLogging({
    email: "new@example.com",
    name: "New User",
    password: "password123",
  })

  expect(result.email).toBe("new@example.com")
  expect(result.name).toBe("New User")
}).pipe(
  Effect.provide(Layer.merge(MockUserRepository, MockLogger)),
)

// Run test
await Effect.runPromise(testCreateUser)
```

### Property-Based Testing

Universal packages work well with property-based testing:

```typescript
import { Arbitrary } from "fast-check"

// Generate test data
const userArbitrary = Arbitrary.record({
  id: Arbitrary.string().filter((s) => s.length > 0 && s.length <= 50),
  email: Arbitrary.emailAddress(),
  name: Arbitrary.string().filter((s) => s.length > 0 && s.length <= 100),
})

// Property-based test
const testUserValidation = Effect.gen(function*() {
  const testData = yield* Effect.sync(() => userArbitrary.sample())

  for (const userData of testData) {
    const result = yield* validateUser(userData)
    expect(result.email).toContain("@")
    expect(result.name.length).toBeGreaterThan(0)
  }
}).pipe(
  Effect.provide(TestDependencies),
)
```

## Performance Patterns

### Lazy Evaluation

Universal packages leverage Effect's lazy evaluation:

```typescript
// Operations are not executed until run
const expensiveUserOperation = Effect.gen(function*() {
  console.log("This only runs when executed")
  const users = yield* UserRepository.findAll()
  const processed = yield* processUsers(users)
  return processed
})

// Compose without executing
const userPipeline = expensiveUserOperation.pipe(
  Effect.map((users) => users.filter((u) => u.isActive)),
  Effect.flatMap((activeUsers) => notifyUsers(activeUsers)),
)

// Execute when needed
await Effect.runPromise(userPipeline)
```

### Resource Management

Universal packages handle resources safely:

```typescript
const withDatabaseTransaction = <A, E>(
  operation: (tx: Transaction) => Effect<A, E>,
) =>
  Effect.acquireUseRelease(
    // Acquire
    Effect.tryPromise({
      try: () => db.transaction(),
      catch: (error) => new RepositoryError("Failed to start transaction", { cause: error }),
    }),
    // Use
    operation,
    // Release
    (tx) => Effect.sync(() => tx.commit()),
  )

// Usage
const createUserInTransaction = (userData: CreateUserData) =>
  withDatabaseTransaction((tx) =>
    Effect.gen(function*() {
      const user = yield* UserRepository.save(userData)
      const profile = yield* ProfileRepository.create(user.id)

      return { user, profile }
    })
  )
```

### Caching

Universal packages provide caching patterns:

```typescript
const cachedUserLookup = (id: UserId) =>
  Effect.gen(function*() {
    const cache = yield* CacheService

    // Try cache first
    const cached = yield* cache.get(`user:${id}`)
    if (cached) {
      return cached
    }

    // Fetch from repository
    const user = yield* UserRepository.findById(id)
    if (user) {
      yield* cache.set(`user:${id}`, user, "1 hour")
    }

    return user
  })
```

## Integration Examples

### Cross-Platform Usage

The same universal package can be used across different platforms:

```typescript
// Universal domain logic
const userOperations = {
  createUser: (data: CreateUserData) =>
    Effect.gen(function*() {
      const validated = yield* validateCreateUserData(data)
      const user = yield* UserRepository.save(validated)
      yield* EventBus.publish(new UserCreatedEvent(user, new Date()))
      return user
    }),
}

// React usage
function ReactUserForm() {
  const handleSubmit = (data: CreateUserData) => {
    Effect.runPromise(
      userOperations.createUser(data)
        .pipe(Effect.provide(ReactDependencies)),
    )
  }
  // ...
}

// SolidJS usage
function SolidUserForm() {
  const handleSubmit = (data: CreateUserData) => {
    Effect.runPromise(
      userOperations.createUser(data)
        .pipe(Effect.provide(SolidDependencies)),
    )
  }
  // ...
}

// Node.js usage
app.post("/users", (req, res) => {
  Effect.runPromise(
    userOperations.createUser(req.body)
      .pipe(
        Effect.provide(NodeDependencies),
        Effect.map((user) => res.json(user)),
        Effect.catchAll((error) => Effect.sync(() => res.status(400).json({ error: error.message }))),
      ),
  )
})
```

## Next Steps

Now that you understand the core concepts, explore the specific universal packages:

- [Chat Domain](/universal/packages/chat-domain/) - Learn chat domain logic
- [Shared Types](/universal/packages/shared-types/) - Explore common types
- [Universal Concepts](/universal/concepts/) - Dive deeper into patterns

## Best Practices

1. **Keep domain logic pure**: Universal packages should not depend on specific frameworks
2. **Use branded types**: Prevent mixing up similar values with branded types
3. **Define clear error types**: Create specific error types for different failure modes
4. **Leverage Effect's composability**: Build complex operations from simple ones
5. **Test with mocks**: Use Effect's context system for easy testing
6. **Handle resources safely**: Use Effect's resource management for cleanup
7. **Design for reusability**: Write code that works across platforms
