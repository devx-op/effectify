---
title: "@effectify/solid-query"
description: Integración de Effect con TanStack Query para aplicaciones SolidJS
---

# @effectify/solid-query

El paquete `@effectify/solid-query` integra Effect con TanStack Query para aplicaciones SolidJS. Permite usar el manejo de errores y la componibilidad de Effect junto con el caché y sincronización de TanStack Query dentro del sistema reactivo de SolidJS.

## Instalación

```bash
npm install @effectify/solid-query @tanstack/solid-query effect solid-js
```

## Uso básico

### Obtención simple de datos con createQuery

```tsx
import { createQuery } from "@tanstack/solid-query"
import { Effect } from "effect"
import { Show } from "solid-js"

const fetchUser = (id: number) =>
  Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`).then((res) => res.json()),
    catch: (error) => new Error(`Failed to fetch user: ${error}`),
  })

function UserProfile(props: { userId: number }) {
  const userQuery = createQuery(() => ({
    queryKey: ["user", props.userId],
    queryFn: () => Effect.runPromise(fetchUser(props.userId)),
  }))

  return (
    <Show when={userQuery.data} fallback={<div>Cargando...</div>}>
      {(user) => (
        <div>
          <h1>{user().name}</h1>
          <Show when={userQuery.isError}>
            <p>Error: {userQuery.error?.message}</p>
          </Show>
        </div>
      )}
    </Show>
  )
}
```

### Usando recursos de SolidJS

```tsx
import { createResource, Show } from "solid-js"
import { Effect } from "effect"

function UserProfile(props: { userId: number }) {
  const [user] = createResource(
    () => props.userId,
    (id) => Effect.runPromise(fetchUser(id)),
  )

  return (
    <Show when={user()} fallback={<div>Cargando...</div>}>
      {(userData) => (
        <div>
          <h1>{userData().name}</h1>
          <p>{userData().email}</p>
        </div>
      )}
    </Show>
  )
}
```

### Con manejo de errores y reintentos

```tsx
import { Effect, pipe } from "effect"

const fetchUserWithRetry = (id: number) =>
  pipe(
    fetchUser(id),
    Effect.retry({ times: 3, delay: "1 second" }),
    Effect.catchAll(() => Effect.succeed({ id, name: "Desconocido", email: "unknown@example.com" })),
  )

function UserProfile(props: { userId: number }) {
  const userQuery = createQuery(() => ({
    queryKey: ["user", props.userId],
    queryFn: () => Effect.runPromise(fetchUserWithRetry(props.userId)),
  }))

  return (
    <Show when={userQuery.data}>
      {(user) => <div>Hola, {user().name}!</div>}
    </Show>
  )
}
```

## Patrones avanzados

### Queries reactivas con señales

```tsx
import { createSignal, For, Show } from "solid-js"
import { createQuery } from "@tanstack/solid-query"

function UserSearch() {
  const [searchTerm, setSearchTerm] = createSignal("")

  const searchQuery = createQuery(() => ({
    queryKey: ["users", "search", searchTerm()],
    queryFn: () => Effect.runPromise(searchUsers(searchTerm())),
    enabled: searchTerm().length > 2,
  }))

  return (
    <div>
      <input
        type="text"
        value={searchTerm()}
        onInput={(e) => setSearchTerm(e.currentTarget.value)}
        placeholder="Buscar usuarios..."
      />
      <Show when={searchQuery.data}>
        <For each={searchQuery.data}>{(user) => <div>{user.name}</div>}</For>
      </Show>
    </div>
  )
}
```

### Combinando múltiples Effects

```tsx
const fetchUserWithPosts = (userId: number) =>
  Effect.all([fetchUser(userId), fetchUserPosts(userId)]).pipe(
    Effect.map(([user, posts]) => ({ user, posts })),
  )

function UserDashboard(props: { userId: number }) {
  const dashboardQuery = createQuery(() => ({
    queryKey: ["userDashboard", props.userId],
    queryFn: () => Effect.runPromise(fetchUserWithPosts(props.userId)),
  }))

  return (
    <Show when={dashboardQuery.data} fallback={<div>Cargando panel...</div>}>
      {(data) => (
        <div>
          <h1>{data().user.name}</h1>
          <div>Posts: {data().posts.length}</div>
        </div>
      )}
    </Show>
  )
}
```

### Tipos de errores personalizados

```tsx
class UserNotFoundError {
  readonly _tag = "UserNotFoundError"
  constructor(readonly userId: number) {}
}

class NetworkError {
  readonly _tag = "NetworkError"
  constructor(readonly message: string) {}
}

const fetchUserTyped = (id: number) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(`/api/users/${id}`)
      if (response.status === 404) throw new UserNotFoundError(id)
      if (!response.ok) throw new NetworkError(`HTTP ${response.status}`)
      return response.json()
    },
    catch: (error) => {
      if (error instanceof UserNotFoundError) return error
      if (error instanceof NetworkError) return error
      return new NetworkError(String(error))
    },
  })

function UserProfile(props: { userId: number }) {
  const userQuery = createQuery(() => ({
    queryKey: ["user", props.userId],
    queryFn: () => Effect.runPromise(fetchUserTyped(props.userId)),
  }))
}
```
