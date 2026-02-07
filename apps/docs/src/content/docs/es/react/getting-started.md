---
title: Primeros pasos con React
description: Aprende a configurar Effectify en tu aplicación React
---

# Primeros pasos con React

Esta guía te ayudará a empezar con Effectify en tu aplicación React. Veremos cómo configurar las dependencias básicas y crear tu primer componente con Effect.

## Requisitos previos

- Node.js 18 o superior
- Una aplicación React (CRA, Vite, Next.js, etc.)
- Conocimientos básicos de React y TypeScript

## Instalación

Elige los paquetes que necesitas:

### Paquete principal de queries

```bash
npm install @effectify/react-query @tanstack/react-query effect
```

### Componentes de UI

```bash
npm install @effectify/react-ui
```

### Componentes de Chat

```bash
npm install @effectify/chat-react
```

## Configuración básica

### 1. Configurar TanStack Query

```tsx
// App.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourAppComponents />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

### 2. Crear tu primer Effect

```tsx
// effects/user.ts
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

### 3. Usar Effect con React Query

```tsx
// components/UserProfile.tsx
import { useQuery } from "@tanstack/react-query"
import { Effect } from "effect"
import { fetchUser } from "../effects/user"

interface UserProfileProps {
  userId: number
}

export function UserProfile({ userId }: UserProfileProps) {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => Effect.runPromise(fetchUser(userId)),
  })

  if (isLoading) return <div>Cargando...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!user) return <div>Usuario no encontrado</div>

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}
```

## Siguientes pasos

- [Integración React Query](packages/react-query/) - Patrones avanzados de obtención de datos
- [Componentes UI](packages/react-ui/) - Explora la biblioteca
- [Componentes de Chat](packages/chat-react/) - Añade tiempo real

## Patrones comunes

### Manejo de errores

```tsx
const fetchUserWithRetry = (id: number) =>
  fetchUser(id).pipe(
    Effect.retry({ times: 3 }),
    Effect.catchAll(() => Effect.succeed({ id, name: "Desconocido", email: "unknown@example.com" })),
  )
```

### Combinación de Effects

```tsx
const fetchUserWithPosts = (id: number) =>
  Effect.all([fetchUser(id), fetchUserPosts(id)]).pipe(
    Effect.map(([user, posts]) => ({ user, posts })),
  )
```

## Resolución de problemas

### Problemas comunes

1. Effect no corre: Asegúrate de llamar a `Effect.runPromise()` en la query
2. Errores de tipos: Usa versiones actuales de Effect y TypeScript
3. Errores de build: Verifica peer dependencies instaladas

### Ayuda

- [GitHub Issues](https://github.com/devx-op/effectify/issues)
- [Discusiones](https://github.com/devx-op/effectify/discussions)
