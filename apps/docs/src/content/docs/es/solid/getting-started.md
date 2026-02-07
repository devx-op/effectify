---
title: Primeros pasos con SolidJS
description: Aprende a configurar Effectify en tu aplicación SolidJS
---

# Primeros pasos con SolidJS

Esta guía te ayudará a empezar con Effectify en tu aplicación SolidJS. Veremos cómo configurar las dependencias básicas y crear tu primer componente con Effect.

## Requisitos previos

- Node.js 18 o superior
- Una aplicación SolidJS (plantilla Vite, SolidStart, etc.)
- Conocimientos básicos de SolidJS y TypeScript

## Instalación

Elige los paquetes que necesitas:

### Paquete principal de queries

```bash
npm install @effectify/solid-query @tanstack/solid-query effect solid-js
```

### Componentes de UI

```bash
npm install @effectify/solid-ui
```

### Componentes de Chat

```bash
npm install @effectify/chat-solid
```

## Configuración básica

### 1. Configurar TanStack Query

```tsx
// src/App.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import { SolidQueryDevtools } from "@tanstack/solid-query-devtools"

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourAppComponents />
      <SolidQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
```

### 2. Crear tu primer Effect

```tsx
// src/effects/user.ts
import { Effect } from "effect"

export interface User {
  id: number
  name: string
  email: string
}

export const fetchUser = (id: number) =>
  Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`).then((res) => res.json()),
    catch: (error) => new Error(`Failed to fetch user: ${error}`),
  })
```

### 3. Usar Effect con recursos de SolidJS

```tsx
// src/components/UserProfile.tsx
import { createResource, Show } from "solid-js"
import { Effect } from "effect"
import { fetchUser } from "../effects/user"

interface UserProfileProps {
  userId: number
}

export function UserProfile(props: UserProfileProps) {
  const [user] = createResource(() => props.userId, (id) => Effect.runPromise(fetchUser(id)))

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

### 4. Usar Effect con TanStack Query

```tsx
// src/components/UserProfileQuery.tsx
import { createQuery } from "@tanstack/solid-query"
import { Show } from "solid-js"
import { Effect } from "effect"
import { fetchUser } from "../effects/user"

interface UserProfileProps {
  userId: number
}

export function UserProfileQuery(props: UserProfileProps) {
  const userQuery = createQuery(() => ({
    queryKey: ["user", props.userId],
    queryFn: () => Effect.runPromise(fetchUser(props.userId)),
  }))

  return (
    <Show when={userQuery.data} fallback={<div>Cargando...</div>}>
      {(user) => (
        <div>
          <h1>{user().name}</h1>
          <p>{user().email}</p>
          <Show when={userQuery.isError}>
            <p class="error">Error: {userQuery.error?.message}</p>
          </Show>
        </div>
      )}
    </Show>
  )
}
```

## Patrones avanzados

### Effects reactivos con señales

```tsx
import { createEffect, createSignal, For, Show } from "solid-js"
import { Effect } from "effect"

function UserSearch() {
  const [query, setQuery] = createSignal("")
  const [results, setResults] = createSignal([])
  const [loading, setLoading] = createSignal(false)

  const searchUsers = (searchQuery: string) =>
    Effect.tryPromise({
      try: () => fetch(`/api/users/search?q=${searchQuery}`).then((res) => res.json()),
      catch: (error) => new Error(`Search failed: ${error}`),
    })

  createEffect(() => {
    const currentQuery = query()
    if (currentQuery.length > 2) {
      setLoading(true)
      Effect.runPromise(
        searchUsers(currentQuery).pipe(
          Effect.tap((results) => Effect.sync(() => setResults(results))),
          Effect.catchAll((error) => Effect.sync(() => console.error(error))),
          Effect.finalize(() => Effect.sync(() => setLoading(false))),
        ),
      )
    }
  })

  return (
    <div>
      <input
        type="text"
        value={query()}
        onInput={(e) => setQuery(e.currentTarget.value)}
        placeholder="Buscar usuarios..."
      />
      <Show when={loading()}>
        <div>Buscando...</div>
      </Show>
      <ul>
        <For each={results()}>{(user) => <li>{user.name}</li>}</For>
      </ul>
    </div>
  )
}
```

### Manejo de errores con Effect

```tsx
const fetchUserWithRetry = (id: number) =>
  fetchUser(id).pipe(
    Effect.retry({ times: 3, delay: "1 second" }),
    Effect.catchAll(() => Effect.succeed({ id, name: "Desconocido", email: "unknown@example.com" })),
  )

function UserProfile(props: { userId: number }) {
  const [user] = createResource(() => props.userId, (id) => Effect.runPromise(fetchUserWithRetry(id)))
}
```
