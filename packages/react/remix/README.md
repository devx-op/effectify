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
import { httpSuccess, httpFailure, LoaderArgsContext } from "@effectify/react-remix";
import { withLoaderEffect } from "~/lib/server-runtime";
import * as Effect from "effect/Effect"

export const loader = withLoaderEffect(
  Effect.gen(function* () {
    const { request } = yield* LoaderArgsContext
    yield* Effect.log("request", request)
    
    // Improved DX: Simple syntax for success responses
    return yield* httpSuccess({ hello: 'world' })
    
    // For error responses, use:
    // return yield* httpFailure("Something went wrong")
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

### Error Responses

For error handling, use the `httpFailure` helper:
```typescript
return yield* httpFailure("Something went wrong")
// or with more complex error objects
return yield* httpFailure({ code: 'VALIDATION_ERROR', message: 'Invalid input' })
```

### Redirects

For redirects, use the `httpRedirect` helper:
```typescript
return yield* httpRedirect('/login')
// or with custom status/headers
return yield* httpRedirect('/dashboard', { status: 301 })
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

- `HttpResponseSuccess<T>(data)`: Successful HTTP response with data
- `HttpResponseFailure<T>(cause)`: Failed HTTP response with cause
- `HttpResponseRedirect(to, init?)`: HTTP redirect response

### Helper Functions

- `httpSuccess<T>(data: T)`: Creates a successful Effect with HttpResponseSuccess
- `httpFailure<T>(cause: T)`: Creates a successful Effect with HttpResponseFailure
- `httpRedirect(to: string, init?: ResponseInit)`: Creates a successful Effect with HttpResponseRedirect

### Error Handling & Logging

The library provides comprehensive error handling with full ErrorBoundary support:

- **Automatic Error Logging**: Errors are automatically logged using `Effect.logError`
- **ErrorBoundary Compatible**: Loader errors are properly thrown as `Response` objects for Remix ErrorBoundary
- **Configurable Logging**: Users can configure their own logging system through Effect layers
- **Non-blocking**: Logging doesn't block the main thread
- **Structured Logging**: Errors are logged with context and structured data
- **Error Preservation**: Original error context is preserved for better debugging

```typescript
// The library automatically logs errors like this:
Effect.tapError((cause) => Effect.logError('Loader effect failed', cause))

// Loader errors are automatically converted to Response objects for ErrorBoundary:
// - Effect errors → Response with { ok: false, errors: [...] } and status 500
// - HttpResponseFailure → Response with { ok: false, errors: [...] } and status 500
// - Original Response/Error objects are preserved

// Users can configure custom logging through Effect layers
const customLogger = Logger.make(({ message, cause }) => {
  // Custom logging implementation
  console.log(`[${new Date().toISOString()}] ${message}`, cause)
})

const runtime = make(pipe(
  // Your app layers
  MyAppLayer,
  // Custom logger layer
  Logger.replace(Logger.defaultLogger, customLogger)
))
```

## Requirements

- Remix 2+
- Effect ecosystem (`effect`)

## License

MIT