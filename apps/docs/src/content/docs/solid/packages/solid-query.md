---
title: "@effectify/solid-query"
description: Effect integration with TanStack Query for SolidJS applications
---

# @effectify/solid-query

The `@effectify/solid-query` package provides seamless integration between Effect and TanStack Query for SolidJS applications. It enables you to use Effect's powerful error handling and composability features while leveraging TanStack Query's caching and synchronization capabilities, all within SolidJS's reactive system.

## Installation

```bash
npm install @effectify/solid-query @tanstack/solid-query effect solid-js
```

## Basic Usage

### Simple Data Fetching with createQuery

```tsx
import { createQuery } from '@tanstack/solid-query'
import { Effect } from 'effect'
import { Show } from 'solid-js'

// Define your Effect
const fetchUser = (id: number) =>
  Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`).then(res => res.json()),
    catch: (error) => new Error(`Failed to fetch user: ${error}`)
  })

// Use in component
function UserProfile(props: { userId: number }) {
  const userQuery = createQuery(() => ({
    queryKey: ['user', props.userId],
    queryFn: () => Effect.runPromise(fetchUser(props.userId))
  }))

  return (
    <Show when={userQuery.data} fallback={<div>Loading...</div>}>
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

### Using SolidJS Resources

For simpler use cases, you can use SolidJS's built-in `createResource`:

```tsx
import { createResource, Show } from 'solid-js'
import { Effect } from 'effect'

function UserProfile(props: { userId: number }) {
  const [user] = createResource(
    () => props.userId,
    (id) => Effect.runPromise(fetchUser(id))
  )

  return (
    <Show when={user()} fallback={<div>Loading...</div>}>
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

### With Error Handling and Retry

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

function UserProfile(props: { userId: number }) {
  const userQuery = createQuery(() => ({
    queryKey: ['user', props.userId],
    queryFn: () => Effect.runPromise(fetchUserWithRetry(props.userId))
  }))

  return (
    <Show when={userQuery.data}>
      {(user) => <div>Hello, {user().name}!</div>}
    </Show>
  )
}
```

## Advanced Patterns

### Reactive Queries with Signals

Combine SolidJS signals with TanStack Query:

```tsx
import { createSignal, createMemo } from 'solid-js'
import { createQuery } from '@tanstack/solid-query'

function UserSearch() {
  const [searchTerm, setSearchTerm] = createSignal('')
  
  const searchQuery = createQuery(() => ({
    queryKey: ['users', 'search', searchTerm()],
    queryFn: () => Effect.runPromise(searchUsers(searchTerm())),
    enabled: searchTerm().length > 2
  }))

  return (
    <div>
      <input
        type="text"
        value={searchTerm()}
        onInput={(e) => setSearchTerm(e.currentTarget.value)}
        placeholder="Search users..."
      />
      <Show when={searchQuery.data}>
        <For each={searchQuery.data}>
          {(user) => <div>{user.name}</div>}
        </For>
      </Show>
    </div>
  )
}
```

### Combining Multiple Effects

```tsx
const fetchUserWithPosts = (userId: number) =>
  Effect.all([
    fetchUser(userId),
    fetchUserPosts(userId)
  ]).pipe(
    Effect.map(([user, posts]) => ({ user, posts }))
  )

function UserDashboard(props: { userId: number }) {
  const dashboardQuery = createQuery(() => ({
    queryKey: ['userDashboard', props.userId],
    queryFn: () => Effect.runPromise(fetchUserWithPosts(props.userId))
  }))

  return (
    <Show when={dashboardQuery.data} fallback={<div>Loading dashboard...</div>}>
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

function UserProfile(props: { userId: number }) {
  const userQuery = createQuery(() => ({
    queryKey: ['user', props.userId],
    queryFn: () => Effect.runPromise(fetchUserTyped(props.userId))
  }))

  return (
    <Switch>
      <Match when={userQuery.isLoading}>
        <div>Loading...</div>
      </Match>
      <Match when={userQuery.error instanceof UserNotFoundError}>
        <div>User {props.userId} not found</div>
      </Match>
      <Match when={userQuery.error instanceof NetworkError}>
        <div>Network error: {userQuery.error.message}</div>
      </Match>
      <Match when={userQuery.data}>
        {(user) => (
          <div>
            <h1>{user().name}</h1>
            <p>{user().email}</p>
          </div>
        )}
      </Match>
    </Switch>
  )
}
```

### Mutations with Effect

```tsx
import { createMutation, useQueryClient } from '@tanstack/solid-query'

const updateUser = (id: number, data: Partial<User>) =>
  Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    catch: (error) => new Error(`Failed to update user: ${error}`)
  })

function EditUserForm(props: { userId: number }) {
  const queryClient = useQueryClient()
  
  const updateMutation = createMutation(() => ({
    mutationFn: (data: Partial<User>) => 
      Effect.runPromise(updateUser(props.userId, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', props.userId] })
    }
  }))

  const [formData, setFormData] = createSignal({ name: '', email: '' })

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    updateMutation.mutate(formData())
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData().name}
        onInput={(e) => setFormData(prev => ({ 
          ...prev, 
          name: e.currentTarget.value 
        }))}
        placeholder="Name"
      />
      <input
        type="email"
        value={formData().email}
        onInput={(e) => setFormData(prev => ({ 
          ...prev, 
          email: e.currentTarget.value 
        }))}
        placeholder="Email"
      />
      <button 
        type="submit" 
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  )
}
```

## Reactive Patterns

### Dependent Queries

```tsx
function UserWithPosts(props: { userId: number }) {
  const userQuery = createQuery(() => ({
    queryKey: ['user', props.userId],
    queryFn: () => Effect.runPromise(fetchUser(props.userId))
  }))

  const postsQuery = createQuery(() => ({
    queryKey: ['posts', props.userId],
    queryFn: () => Effect.runPromise(fetchUserPosts(props.userId)),
    enabled: !!userQuery.data
  }))

  return (
    <div>
      <Show when={userQuery.data}>
        {(user) => <h1>{user().name}</h1>}
      </Show>
      <Show when={postsQuery.data}>
        <For each={postsQuery.data}>
          {(post) => <div>{post.title}</div>}
        </For>
      </Show>
    </div>
  )
}
```

### Infinite Queries

```tsx
import { createInfiniteQuery } from '@tanstack/solid-query'

const fetchPosts = (page: number) =>
  Effect.tryPromise({
    try: () => fetch(`/api/posts?page=${page}`).then(res => res.json()),
    catch: (error) => new Error(`Failed to fetch posts: ${error}`)
  })

function PostList() {
  const postsQuery = createInfiniteQuery(() => ({
    queryKey: ['posts'],
    queryFn: ({ pageParam = 1 }) => 
      Effect.runPromise(fetchPosts(pageParam)),
    getNextPageParam: (lastPage, pages) => 
      lastPage.hasMore ? pages.length + 1 : undefined,
    initialPageParam: 1
  }))

  return (
    <div>
      <For each={postsQuery.data?.pages}>
        {(page) => (
          <For each={page.posts}>
            {(post) => <div>{post.title}</div>}
          </For>
        )}
      </For>
      <Show when={postsQuery.hasNextPage}>
        <button 
          onClick={() => postsQuery.fetchNextPage()}
          disabled={postsQuery.isFetchingNextPage}
        >
          {postsQuery.isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      </Show>
    </div>
  )
}
```

## Best Practices

### 1. Use Proper Query Keys

Create query key factories for consistency:

```tsx
const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
}

// Usage
const userQuery = createQuery(() => ({
  queryKey: userKeys.detail(props.userId),
  queryFn: () => Effect.runPromise(fetchUser(props.userId))
}))
```

### 2. Handle Loading and Error States

```tsx
function UserProfile(props: { userId: number }) {
  const userQuery = createQuery(() => ({
    queryKey: ['user', props.userId],
    queryFn: () => Effect.runPromise(fetchUser(props.userId))
  }))

  return (
    <Switch>
      <Match when={userQuery.isLoading}>
        <div>Loading user...</div>
      </Match>
      <Match when={userQuery.isError}>
        <div>Error: {userQuery.error?.message}</div>
      </Match>
      <Match when={userQuery.data}>
        {(user) => (
          <div>
            <h1>{user().name}</h1>
            <p>{user().email}</p>
          </div>
        )}
      </Match>
    </Switch>
  )
}
```

### 3. Leverage Effect's Composability

```tsx
const fetchUserProfile = (id: number) =>
  pipe(
    fetchUser(id),
    Effect.flatMap(user => 
      pipe(
        fetchUserPreferences(user.id),
        Effect.map(preferences => ({ user, preferences }))
      )
    ),
    Effect.retry({ times: 2 }),
    Effect.timeout('10 seconds')
  )
```

## Integration with SolidJS Ecosystem

### With SolidJS Router

```tsx
import { useParams } from '@solidjs/router'

function UserPage() {
  const params = useParams()
  
  const userQuery = createQuery(() => ({
    queryKey: ['user', params.id],
    queryFn: () => Effect.runPromise(fetchUser(Number(params.id)))
  }))

  return (
    <Show when={userQuery.data}>
      {(user) => <UserProfile user={user()} />}
    </Show>
  )
}
```

### With SolidJS Store

```tsx
import { createStore } from 'solid-js/store'

function UserManager() {
  const [store, setStore] = createStore({ selectedUserId: null })
  
  const userQuery = createQuery(() => ({
    queryKey: ['user', store.selectedUserId],
    queryFn: () => Effect.runPromise(fetchUser(store.selectedUserId)),
    enabled: !!store.selectedUserId
  }))

  return (
    <div>
      <button onClick={() => setStore('selectedUserId', 1)}>
        Load User 1
      </button>
      <Show when={userQuery.data}>
        {(user) => <div>{user().name}</div>}
      </Show>
    </div>
  )
}
```

## Examples

Check out the complete implementation in:
- [SolidJS SPA example](https://github.com/devx-op/effectify/tree/main/apps/solid-app-spa)
- [SolidJS Start example](https://github.com/devx-op/effectify/tree/main/apps/solid-app-start)

## API Reference

### Effect Utilities

- `Effect.runPromise()` - Convert Effect to Promise for use with TanStack Query
- `Effect.retry()` - Add retry logic to your Effects
- `Effect.timeout()` - Add timeout handling
- `Effect.catchAll()` - Handle all possible errors
- `Effect.all()` - Combine multiple Effects

### SolidJS Integration

- Works seamlessly with `createQuery`, `createMutation`, `createInfiniteQuery`
- Compatible with `createResource` for simpler use cases
- Integrates with SolidJS's reactive system and signals

## Troubleshooting

### Common Issues

1. **Effect not executing**: Ensure you're calling `Effect.runPromise()`
2. **Reactivity not working**: Make sure query keys are reactive (use functions)
3. **Type errors**: Verify all peer dependencies are installed
4. **Stale data**: Use proper query key invalidation strategies

### Performance Tips

- Use `Effect.cached()` for expensive computations
- Implement proper query key strategies
- Leverage TanStack Query's built-in optimizations
- Use SolidJS's fine-grained reactivity effectively
