---
title: Getting Started with React
description: Learn how to set up Effectify in your React application
---

# Getting Started with React

This guide will help you get started with Effectify in your React application. We'll walk through setting up the basic dependencies and creating your first Effect-powered React component.

## Prerequisites

Before you begin, make sure you have:

- Node.js 18 or later
- A React application (Create React App, Vite, Next.js, etc.)
- Basic knowledge of React and TypeScript

## Installation

Choose the packages you need for your project:

### Core Query Package

For data fetching with TanStack Query and Effect:

```bash
npm install @effectify/react-query @tanstack/react-query effect
```

### UI Components

For pre-built UI components:

```bash
npm install @effectify/react-ui
```

### Chat Components

For real-time chat functionality:

```bash
npm install @effectify/chat-react
```

## Basic Setup

### 1. Configure TanStack Query

First, set up TanStack Query in your app root:

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

### 2. Create Your First Effect

Create a simple Effect that fetches data:

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

### 3. Use Effect with React Query

Now use the Effect in a React component:

```tsx
// components/UserProfile.tsx
import { useQuery } from "@tanstack/react-query"
import { Effect } from "effect"
import { fetchUser } from "../effects/user"

interface UserProfileProps {
  userId: number
}

export function UserProfile({ userId }: UserProfileProps) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => Effect.runPromise(fetchUser(userId)),
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!user) return <div>User not found</div>

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}
```

## Next Steps

Now that you have the basics set up, explore the specific packages:

- [React Query Integration](/react/packages/react-query/) - Learn advanced patterns for data fetching
- [UI Components](/react/packages/react-ui/) - Explore the component library
- [Chat Components](/react/packages/chat-react/) - Add real-time features

## Common Patterns

### Error Handling

Effect provides excellent error handling capabilities:

```tsx
const fetchUserWithRetry = (id: number) =>
  fetchUser(id).pipe(
    Effect.retry({ times: 3 }),
    Effect.catchAll((error) => Effect.succeed({ id, name: "Unknown", email: "unknown@example.com" })),
  )
```

### Combining Effects

You can compose multiple Effects together:

```tsx
const fetchUserWithPosts = (id: number) =>
  Effect.all([
    fetchUser(id),
    fetchUserPosts(id),
  ]).pipe(
    Effect.map(([user, posts]) => ({ user, posts })),
  )
```

## Troubleshooting

### Common Issues

1. **Effect not running**: Make sure to call `Effect.runPromise()` in your query function
2. **Type errors**: Ensure you have the latest versions of Effect and TypeScript
3. **Build errors**: Check that all peer dependencies are installed

### Getting Help

If you run into issues:

- Check the [GitHub Issues](https://github.com/devx-op/effectify/issues)
- Join the [Discussions](https://github.com/devx-op/effectify/discussions)
- Review the package-specific documentation
