# @effectify/react-remix

Integration of [Remix](https://remix.com/) with [Effect](https://effect.website/) for React applications.

## Installation

```bash
# npm
npm install @effectify/react-remix

# yarn
yarn add @effectify/react-remix

# pnpm
pnpm add @effectify/react-remix

# bun
bun add @effectify/react-remix
```

## Basic Usage

### 1. Setup Server Runtime

Create a server runtime with your Effect layers:

```typescript
// lib/server-runtime.ts
import { Runtime } from "@effectify/react-remix";
import * as Layer from "effect/Layer"

const layers = Layer.empty

export const { withLoaderEffect, withActionEffect } = Runtime.make(layers)
```

### 2. Use in Route Components

Use the Effect-based loaders and actions in your Remix routes:

```typescript
// routes/home.tsx
import type * as Route from "./+types.home";
import { Ok, LoaderArgsContext } from "@effectify/react-remix";
import { withLoaderEffect } from "~/lib/server-runtime";
import * as Effect from "effect/Effect"

export const loader = withLoaderEffect(
  Effect.gen(function* () {
    const { request } = yield* LoaderArgsContext
    yield* Effect.log("request", request)
    return yield* Effect.succeed(new Ok({ data: { hello: 'world' }}))
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

Creates Effect-based runtime helpers for Remix.

#### Parameters

- `layers`: Effect Layer containing your application services and dependencies.

#### Returns

An object containing:
- `withLoaderEffect`: Wrapper for Remix loaders using Effect
- `withActionEffect`: Wrapper for Remix actions using Effect

### `LoaderArgsContext`

Effect context providing access to Remix loader arguments including:
- `request`: The incoming Request object
- `params`: Route parameters
- `context`: Additional context data

### Response Types

- `Ok(data)`: Successful response with data
- `Redirect(url)`: Redirect response
- `Error(message)`: Error response

## Requirements

- Remix 2+
- Effect ecosystem (`effect`)

## License

MIT