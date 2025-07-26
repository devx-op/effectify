---
title: "@effectify/react-query"
description: Effect integration with TanStack Query for React applications
---

# @effectify/react-query

The `@effectify/react-query` package provides seamless integration between Effect and TanStack Query for React applications. It enables you to use Effect's powerful error handling and composability features while leveraging TanStack Query's caching and synchronization capabilities.

## Installation

```bash
npm install @effectify/react-query @tanstack/react-query effect react
```

## Basic Usage

### Simple Data Fetching

```tsx
import { useQuery } from '@tanstack/react-query'
import { Effect } from 'effect'

// Define your Effect
const fetchUser = (id: number) =>
  Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`).then(res => res.json()),
    catch: (error) => new Error(`Failed to fetch user: ${error}`)
  })

// Use in component
function UserProfile({ userId }: { userId: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => Effect.runPromise(fetchUser(userId))
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return <div>Hello, {data?.name}!</div>
}
```

### With Error Handling

```tsx
import { Effect, pipe } from 'effect'

const fetchUserWithRetry = (id: number) =>
  pipe(
    fetchUser(id),
    Effect.retry({ times: 3, delay: '1 second' }),
    Effect.catchAll(error => 
      Effect.succeed({ 
        id, 
        name: 'Unknown User', 
        email: 'unknown@example.com' 
      })
    )
  )

function UserProfile({ userId }: { userId: number }) {
  const { data } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => Effect.runPromise(fetchUserWithRetry(userId))
  })

  return <div>Hello, {data?.name}!</div>
}
```

## Advanced Patterns

### Combining Multiple Effects

```tsx
const fetchUserWithPosts = (userId: number) =>
  Effect.all([
    fetchUser(userId),
    fetchUserPosts(userId)
  ]).pipe(
    Effect.map(([user, posts]) => ({ user, posts }))
  )

function UserDashboard({ userId }: { userId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['userDashboard', userId],
    queryFn: () => Effect.runPromise(fetchUserWithPosts(userId))
  })

  if (isLoading) return <div>Loading dashboard...</div>

  return (
    <div>
      <h1>{data?.user.name}</h1>
      <div>Posts: {data?.posts.length}</div>
    </div>
  )
}
```

### Custom Error Types

```tsx
class UserNotFoundError {
  readonly _tag = 'UserNotFoundError'
  constructor(readonly userId: number) {}
}

class NetworkError {
  readonly _tag = 'NetworkError'
  constructor(readonly message: string) {}
}

const fetchUserTyped = (id: number) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(`/api/users/${id}`)
      if (response.status === 404) {
        throw new UserNotFoundError(id)
      }
      if (!response.ok) {
        throw new NetworkError(`HTTP ${response.status}`)
      }
      return response.json()
    },
    catch: (error) => {
      if (error instanceof UserNotFoundError) return error
      if (error instanceof NetworkError) return error
      return new NetworkError(String(error))
    }
  })

function UserProfile({ userId }: { userId: number }) {
  const { data, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => Effect.runPromise(fetchUserTyped(userId))
  })

  if (error) {
    if (error instanceof UserNotFoundError) {
      return <div>User {error.userId} not found</div>
    }
    if (error instanceof NetworkError) {
      return <div>Network error: {error.message}</div>
    }
  }

  return <div>Hello, {data?.name}!</div>
}
```

### Mutations with Effect

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

const updateUser = (id: number, data: Partial<User>) =>
  Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    catch: (error) => new Error(`Failed to update user: ${error}`)
  })

function EditUserForm({ userId }: { userId: number }) {
  const queryClient = useQueryClient()
  
  const mutation = useMutation({
    mutationFn: (data: Partial<User>) => 
      Effect.runPromise(updateUser(userId, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    }
  })

  const handleSubmit = (formData: Partial<User>) => {
    mutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button 
        type="submit" 
        disabled={mutation.isPending}
      >
        {mutation.isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  )
}
```

## Best Practices

### 1. Use Proper Error Types

Define specific error types for better error handling:

```tsx
// Good
class ValidationError {
  readonly _tag = 'ValidationError'
  constructor(readonly errors: string[]) {}
}

// Instead of generic Error
```

### 2. Leverage Effect's Composability

```tsx
const fetchUserProfile = (id: number) =>
  pipe(
    fetchUser(id),
    Effect.flatMap(user => 
      pipe(
        fetchUserPreferences(user.id),
        Effect.map(preferences => ({ user, preferences }))
      )
    )
  )
```

### 3. Use Query Keys Consistently

```tsx
// Create query key factories
const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
}
```

## API Reference

### Effect Utilities

The package provides utilities for working with Effects in React Query contexts:

- `Effect.runPromise()` - Convert Effect to Promise for use with TanStack Query
- `Effect.retry()` - Add retry logic to your Effects
- `Effect.timeout()` - Add timeout handling
- `Effect.catchAll()` - Handle all possible errors

### Integration Patterns

- **Queries**: Use `Effect.runPromise()` in `queryFn`
- **Mutations**: Use `Effect.runPromise()` in `mutationFn`
- **Optimistic Updates**: Combine with Effect's state management
- **Background Refetch**: Leverage Effect's scheduling capabilities

## Examples

Check out the [React SPA example](https://github.com/devx-op/effectify/tree/main/apps/react-app-spa) for a complete implementation using `@effectify/react-query`.

## Troubleshooting

### Common Issues

1. **Effect not executing**: Ensure you're calling `Effect.runPromise()`
2. **Type errors**: Make sure all peer dependencies are installed
3. **Stale data**: Use proper query key invalidation

### Performance Tips

- Use `Effect.cached()` for expensive computations
- Implement proper query key strategies
- Leverage TanStack Query's built-in optimizations
