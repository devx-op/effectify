---
title: Referencia de API de SolidJS
description: Referencia de API de Effectify Solid Query
---

# Referencia de API de SolidJS

Esta página cubre la integración de Effectify entre Effect y TanStack Query para SolidJS.

## @effectify/solid-query

### Integración con TanStack Query

#### `createQuery` con Effect

```tsx
import { createQuery } from "@tanstack/solid-query"
import { Effect } from "effect"

const userQuery = createQuery(() => ({
  queryKey: ["user", userId()],
  queryFn: () => Effect.runPromise(fetchUserEffect(userId())),
}))
```

#### `createMutation` con Effect

```tsx
import { createMutation } from "@tanstack/solid-query"

const updateMutation = createMutation(() => ({
  mutationFn: (data: UserData) => Effect.runPromise(updateUserEffect(data)),
}))
```

#### `createInfiniteQuery` con Effect

```tsx
import { createInfiniteQuery } from "@tanstack/solid-query"

const postsQuery = createInfiniteQuery(() => ({
  queryKey: ["posts"],
  queryFn: ({ pageParam = 1 }) => Effect.runPromise(fetchPostsEffect(pageParam)),
  getNextPageParam: (lastPage) => lastPage.nextPage,
  initialPageParam: 1,
}))
```

### Integración con recursos de SolidJS

#### `createResource` con Effect

```tsx
import { createResource } from "solid-js"

const [user] = createResource(() => userId(), (id) => Effect.runPromise(fetchUserEffect(id)))
```
