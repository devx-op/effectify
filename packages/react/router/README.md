# @effectify/react-router

Integration of [React Router](https://reactrouter.com/) with [Effect](https://effect.website/) for React applications.

## Installation

```bash
# npm
npm install @effectify/react-router

# yarn
yarn add @effectify/react-router

# pnpm
pnpm add @effectify/react-router

# bun
bun add @effectify/react-router
```

## Basic Usage

### 1. Setup Server Runtime

Create a server runtime with your Effect layers:

```typescript
// lib/server-runtime.ts
import { make } from "@effectify/react-router";
import * as Layer from "effect/Layer"

const layers = Layer.empty

export const { withLoaderEffect, withActionEffect } = make(layers)
```

### 2. Use in Route Components

Use the Effect-based loaders and actions in your React Router routes:

```typescript
// routes/home.tsx
import type * as Route from "./+types.home";
import { Ok, LoaderArgsContext } from "@effectify/react-router";
import { withLoaderEffect } from "~/lib/server-runtime";
import * as T from "effect/Effect"

export const loader = withLoaderEffect(
  T.gen(function* () {
    const { request } = yield* LoaderArgsContext
    yield* T.log("request", request)
    return yield* T.succeed(new Ok({ data: { hello: 'world' }}))
  })
)

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h1>Home</h1>
      <pre>{JSON.stringify(loaderData.data, null, 2)}</pre>
    </div>
  )
}
```

## API

### `make(layers)`

Creates Effect-based runtime helpers for React Router.

#### Parameters

- `layers`: Effect Layer containing your application services and dependencies.

#### Returns

An object containing:
- `withLoaderEffect`: Wrapper for React Router loaders using Effect
- `withActionEffect`: Wrapper for React Router actions using Effect

### `LoaderArgsContext`

Effect context providing access to React Router loader arguments including:
- `request`: The incoming Request object
- `params`: Route parameters
- `context`: Additional context data

### Response Types

- `Ok(data)`: Successful response with data
- `Redirect(url)`: Redirect response
- `Error(message)`: Error response

## Requirements

- React Router v7+
- Effect ecosystem (`effect`)

## License

MIT