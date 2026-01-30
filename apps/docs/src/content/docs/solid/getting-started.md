---
title: Getting Started with SolidJS
description: Learn how to set up Effectify in your SolidJS application
---

# Getting Started with SolidJS

This guide will help you get started with Effectify in your SolidJS application. We'll walk through setting up the basic dependencies and creating your first Effect-powered SolidJS component.

## Prerequisites

Before you begin, make sure you have:

- Node.js 18 or later
- A SolidJS application (Vite template, SolidStart, etc.)
- Basic knowledge of SolidJS and TypeScript

## Installation

Choose the packages you need for your project:

### Core Query Package

For data fetching with TanStack Query and Effect:

```bash
npm install @effectify/solid-query @tanstack/solid-query effect solid-js
```

### UI Components

For pre-built UI components:

```bash
npm install @effectify/solid-ui
```

### Chat Components

For real-time chat functionality:

```bash
npm install @effectify/chat-solid
```

## Basic Setup

### 1. Configure TanStack Query

First, set up TanStack Query in your app root:

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

### 2. Create Your First Effect

Create a simple Effect that fetches data:

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

### 3. Use Effect with SolidJS Resources

SolidJS provides `createResource` for async data fetching:

```tsx
// src/components/UserProfile.tsx
import { createResource, Show } from "solid-js"
import { Effect } from "effect"
import { fetchUser } from "../effects/user"

interface UserProfileProps {
  userId: number
}

export function UserProfile(props: UserProfileProps) {
  const [user] = createResource(
    () => props.userId,
    (id) => Effect.runPromise(fetchUser(id)),
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

### 4. Use Effect with TanStack Query

For more advanced caching and synchronization:

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
    <Show when={userQuery.data} fallback={<div>Loading...</div>}>
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

## Advanced Patterns

### Reactive Effects with Signals

Combine SolidJS signals with Effects:

```tsx
import { createEffect, createSignal } from "solid-js"
import { Effect } from "effect"

function UserSearch() {
  const [query, setQuery] = createSignal("")
  const [results, setResults] = createSignal([])
  const [loading, setLoading] = createSignal(false)

  const searchUsers = (searchQuery: string) =>
    Effect.tryPromise({
      try: () =>
        fetch(`/api/users/search?q=${searchQuery}`)
          .then((res) => res.json()),
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
        placeholder="Search users..."
      />
      <Show when={loading()}>
        <div>Searching...</div>
      </Show>
      <ul>
        <For each={results()}>
          {(user) => <li>{user.name}</li>}
        </For>
      </ul>
    </div>
  )
}
```

### Error Handling with Effect

Effect provides excellent error handling capabilities:

```tsx
const fetchUserWithRetry = (id: number) =>
  fetchUser(id).pipe(
    Effect.retry({ times: 3, delay: "1 second" }),
    Effect.catchAll((error) =>
      Effect.succeed({
        id,
        name: "Unknown User",
        email: "unknown@example.com",
      })
    ),
  )

function UserProfile(props: { userId: number }) {
  const [user] = createResource(
    () => props.userId,
    (id) => Effect.runPromise(fetchUserWithRetry(id)),
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

### Combining Multiple Effects

You can compose multiple Effects together:

```tsx
const fetchUserWithPosts = (id: number) =>
  Effect.all([
    fetchUser(id),
    fetchUserPosts(id),
  ]).pipe(
    Effect.map(([user, posts]) => ({ user, posts })),
  )

function UserDashboard(props: { userId: number }) {
  const [data] = createResource(
    () => props.userId,
    (id) => Effect.runPromise(fetchUserWithPosts(id)),
  )

  return (
    <Show when={data()} fallback={<div>Loading dashboard...</div>}>
      {(dashboardData) => (
        <div>
          <h1>{dashboardData().user.name}</h1>
          <div>Posts: {dashboardData().posts.length}</div>
        </div>
      )}
    </Show>
  )
}
```

## Next Steps

Now that you have the basics set up, explore the specific packages:

- [Solid Query Integration](/solid/packages/solid-query/) - Learn advanced patterns for data fetching
- [UI Components](/solid/packages/solid-ui/) - Explore the component library
- [Chat Components](/solid/packages/chat-solid/) - Add real-time features

## Common Patterns

### Form Handling

```tsx
import { createSignal } from "solid-js"
import { Effect } from "effect"

const submitForm = (data: FormData) =>
  Effect.tryPromise({
    try: () =>
      fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => res.json()),
    catch: (error) => new Error(`Form submission failed: ${error}`),
  })

function ContactForm() {
  const [formData, setFormData] = createSignal({ name: "", email: "" })
  const [submitting, setSubmitting] = createSignal(false)

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    setSubmitting(true)

    Effect.runPromise(
      submitForm(formData()).pipe(
        Effect.tap(() => Effect.sync(() => console.log("Form submitted!"))),
        Effect.catchAll((error) => Effect.sync(() => console.error(error))),
        Effect.finalize(() => Effect.sync(() => setSubmitting(false))),
      ),
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData().name}
        onInput={(e) =>
          setFormData((prev) => ({
            ...prev,
            name: e.currentTarget.value,
          }))}
        placeholder="Name"
      />
      <input
        type="email"
        value={formData().email}
        onInput={(e) =>
          setFormData((prev) => ({
            ...prev,
            email: e.currentTarget.value,
          }))}
        placeholder="Email"
      />
      <button type="submit" disabled={submitting()}>
        {submitting() ? "Submitting..." : "Submit"}
      </button>
    </form>
  )
}
```

## Troubleshooting

### Common Issues

1. **Effect not running**: Make sure to call `Effect.runPromise()` in your resource function
2. **Reactivity not working**: Ensure you're using SolidJS primitives correctly with Effects
3. **Type errors**: Ensure you have the latest versions of Effect, SolidJS, and TypeScript
4. **Build errors**: Check that all peer dependencies are installed

### Getting Help

If you run into issues:

- Check the [GitHub Issues](https://github.com/devx-op/effectify/issues)
- Join the [Discussions](https://github.com/devx-op/effectify/discussions)
- Review the package-specific documentation
- Ask in the [SolidJS Discord](https://discord.com/invite/solidjs)
