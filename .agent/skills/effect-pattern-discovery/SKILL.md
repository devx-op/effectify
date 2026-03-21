---
name: effect-pattern-discovery
description: >
  Effect-TS patterns sourced from effect-smol reference implementation.
  Trigger: When implementing Effect, Layer, Schema, Pipe, Context, or error handling patterns.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Implementing Effect-based services or layers
- Creating structured errors with Data.TaggedError or Schema.ErrorClass
- Building pipeable modules with dual functions
- Defining Context/Service patterns with Context.Tag
- Composing Layers with provide/merge

## Critical Patterns

### ❌ FORBIDDEN: try-catch in Effect.gen

```typescript
// ❌ WRONG - Breaks Effect semantics
Effect.gen(function*() {
  try {
    return yield* someEffect
  } catch (error) {
    // Never reached!
  }
})

// ✅ CORRECT - Use Effect.result or Effect.catchTag
Effect.gen(function*() {
  const result = yield* Effect.result(someEffect)
  if (result._tag === "Failure") {
    return yield* Effect.fail(handleError(result.cause))
  }
  return result.value
})
```

### ❌ FORBIDDEN: Type Assertions

```typescript
// ❌ FORBIDDEN - These break type safety
const value = something as any
const value = something as never

// ✅ CORRECT - Use proper Effect constructors
const safeValue = Effect.try(() => JSON.parse(jsonString))
```

### ✅ MANDATORY: return yield\* for Terminal Effects

```typescript
Effect.gen(function*() {
  if (invalidCondition) {
    return yield* Effect.fail("Error") // ✅ correct
  }

  if (shouldInterrupt) {
    return yield* Effect.interrupt // ✅ correct
  }

  return result // ✅ correct
})
```

## Code Examples

### Service Definition with Context.Tag

```typescript
import { Context, Effect, Layer } from "effect"

class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  {
    readonly query: (
      sql: string,
    ) => Effect.Effect<unknown[], DatabaseError, never>
  }
>() {}

class UserService extends Context.Tag("UserService")<
  UserService,
  {
    readonly getUser: (id: string) => Effect.Effect<User, UserError, never>
  }
>() {}

// Layer implementation
const DatabaseServiceLive = Layer.succeed(
  DatabaseService,
  DatabaseService.of({
    query: (sql) =>
      Effect.tryPromise({
        try: () => db.execute(sql),
        catch: (e) => new DatabaseError({ cause: e }),
      }),
  }),
)
```

### Structured Errors with Data.TaggedError

```typescript
import { Data, Effect } from "effect"

class ValidationError extends Data.TaggedError("ValidationError")<{
  field: string
  message: string
}> {}

class NetworkError extends Data.TaggedError("NetworkError")<{
  status: number
  url: string
  cause?: unknown
}> {}

// Usage with catchTag
const program = operation().pipe(
  Effect.catchTag("ValidationError", (e) => Console.log(`Invalid field: ${e.field}`)),
)
```

### Schema.ErrorClass for Serializable Errors

```typescript
import { Schema } from "effect"

class ApiError extends Schema.ErrorClass("@effectify/ApiError")({
  _tag: Schema.tag("ApiError"),
  code: Schema.String,
  message: Schema.String,
}) {
  get message() {
    return `[${this.code}] ${this.message}`
  }
}
```

### Effect.fn vs Effect.fnUntraced

| Function                  | Use Case                   | Tracing     |
| ------------------------- | -------------------------- | ----------- |
| `Effect.fn("name")(fn)`   | Public API, reusable       | ✅ Yes      |
| `Effect.fnUntraced(fn)`   | Internal hot paths         | ❌ No       |
| `Effect.gen(function*())` | One-off inline composition | Uses parent |

### Dual Function Pattern

```typescript
import { dual } from "effect"

export const map = dual<
  <A, B>(f: (a: A) => B) => (self: Module<A>) => Module<B>,
  <A, B>(self: Module<A>, f: (a: A) => B) => Module<B>
>(2, (self, f) => /* implementation */)
```

### Layer Composition

```typescript
const AppLayer = UserServiceLive.pipe(
  Layer.provide(DatabaseServiceLive),
  Layer.launch,
)

// Or with merge
const CombinedLayer = Layer.merge(UserServiceLive, DatabaseServiceLive)
```

## Commands

```bash
# Scan for similar patterns in effect-smol
ls .effect-reference/packages/effect/src/

# Check internal implementations
cat .effect-reference/packages/effect/src/internal/effect.ts

# Look at module exports
cat .effect-reference/packages/effect/src/index.ts
```

## Resources

- **effect-smol source**: `.effect-reference/packages/effect/src/`
- **Pattern docs**: `.effect-reference/.patterns/`
- **Error handling**: `.effect-reference/.patterns/error-handling.md`
- **Module organization**: `.effect-reference/.patterns/module-organization.md`
- **Library development**: `.effect-reference/.patterns/effect-library-development.md`
