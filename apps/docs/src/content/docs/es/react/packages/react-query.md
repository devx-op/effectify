---
title: "@effectify/react-query"
description: Integración de Effect con TanStack Query para aplicaciones React
---

# @effectify/react-query

El paquete `@effectify/react-query` integra Effect con TanStack Query para aplicaciones React. Aprovecha el manejo de errores y la componibilidad de Effect junto con el caché y sincronización de TanStack Query.

## Instalación

```bash
npm install @effectify/react-query @tanstack/react-query effect react
```

## Uso básico

### Obtención simple de datos

```tsx
import { useQuery } from "@tanstack/react-query"
import { Effect } from "effect"

const fetchUser = (id: number) =>
  Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`).then((res) => res.json()),
    catch: (error) => new Error(`Failed to fetch user: ${error}`),
  })

function UserProfile({ userId }: { userId: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => Effect.runPromise(fetchUser(userId)),
  })

  if (isLoading) return <div>Cargando...</div>
  if (error) return <div>Error: {error.message}</div>
  return <div>Hola, {data?.name}!</div>
}
```

### Con manejo de errores

```tsx
import { Effect, pipe } from "effect"

const fetchUserWithRetry = (id: number) =>
  pipe(
    fetchUser(id),
    Effect.retry({ times: 3, delay: "1 second" }),
    Effect.catchAll(() => Effect.succeed({ id, name: "Usuario desconocido", email: "unknown@example.com" })),
  )

function UserProfile({ userId }: { userId: number }) {
  const { data } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => Effect.runPromise(fetchUserWithRetry(userId)),
  })
  return <div>Hola, {data?.name}!</div>
}
```

## Patrones avanzados

### Combinando múltiples Effects

```tsx
const fetchUserWithPosts = (userId: number) =>
  Effect.all([fetchUser(userId), fetchUserPosts(userId)]).pipe(
    Effect.map(([user, posts]) => ({ user, posts })),
  )

function UserDashboard({ userId }: { userId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["userDashboard", userId],
    queryFn: () => Effect.runPromise(fetchUserWithPosts(userId)),
  })

  if (isLoading) return <div>Cargando panel...</div>
  return (
    <div>
      <h1>{data?.user.name}</h1>
      <div>Posts: {data?.posts.length}</div>
    </div>
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

function UserProfile({ userId }: { userId: number }) {
  const { data, error } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => Effect.runPromise(fetchUserTyped(userId)),
  })

  if (error) {
    if (error instanceof UserNotFoundError) return <div>Usuario {error.userId} no encontrado</div>
    if (error instanceof NetworkError) return <div>Error de red: {error.message}</div>
  }
  return <div>Hola, {data?.name}!</div>
}
```

### Mutations con Effect

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query"

const updateUser = (id: number, data: Partial<User>) =>
  Effect.tryPromise({
    try: () =>
      fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => res.json()),
    catch: (error) => new Error(`Failed to update user: ${error}`),
  })

function EditUserForm({ userId }: { userId: number }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: Partial<User>) => Effect.runPromise(updateUser(userId, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", userId] })
    },
  })

  const handleSubmit = (formData: Partial<User>) => {
    mutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Guardando..." : "Guardar"}
      </button>
    </form>
  )
}
```
