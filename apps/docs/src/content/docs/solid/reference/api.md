---
title: SolidJS API Reference
description: API reference for Effectify Solid Query
---

# SolidJS API Reference

This page covers the Effectify integration between Effect and TanStack Query for SolidJS.

## @effectify/solid-query

### Integration with TanStack Query

#### `createQuery` with Effect

```tsx
import { createQuery } from "@tanstack/solid-query"
import { Effect } from "effect"

const userQuery = createQuery(() => ({
  queryKey: ["user", userId()],
  queryFn: () => Effect.runPromise(fetchUserEffect(userId())),
}))
```

#### `createMutation` with Effect

```tsx
import { createMutation } from "@tanstack/solid-query"

const updateMutation = createMutation(() => ({
  mutationFn: (data: UserData) => Effect.runPromise(updateUserEffect(data)),
}))
```

#### `createInfiniteQuery` with Effect

```tsx
import { createInfiniteQuery } from "@tanstack/solid-query"

const postsQuery = createInfiniteQuery(() => ({
  queryKey: ["posts"],
  queryFn: ({ pageParam = 1 }) => Effect.runPromise(fetchPostsEffect(pageParam)),
  getNextPageParam: (lastPage) => lastPage.nextPage,
  initialPageParam: 1,
}))
```

### Integration with SolidJS Resources

#### `createResource` with Effect

```tsx
import { createResource } from "solid-js"

const [user] = createResource(
  () => userId(),
  (id) => Effect.runPromise(fetchUserEffect(id)),
)
```

## SolidJS-Specific Patterns

### Reactive Queries

```tsx
// Query that reacts to signal changes
const [userId, setUserId] = createSignal(1)

const userQuery = createQuery(() => ({
  queryKey: ["user", userId()],
  queryFn: () => Effect.runPromise(fetchUser(userId())),
}))
```

### Resource Integration

```tsx
// Using createResource with Effect
const [user, { mutate, refetch }] = createResource(
  () => userId(),
  (id) => Effect.runPromise(fetchUser(id)),
)
```

## Error Handling Patterns

### Effect Error Types

```tsx
// Base error class
class EffectifyError extends Error {
  readonly _tag: string
  constructor(message: string, readonly cause?: unknown) {
    super(message)
  }
}

// Network errors
class NetworkError extends EffectifyError {
  readonly _tag = "NetworkError"
}

// Validation errors
class ValidationError extends EffectifyError {
  readonly _tag = "ValidationError"
  constructor(message: string, readonly errors: string[]) {
    super(message)
  }
}
```
