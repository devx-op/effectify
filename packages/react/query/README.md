# @effectify/react-query

Integration of [Effect](https://effect.website/) with [TanStack Query](https://tanstack.com/query/latest) for [React](https://react.dev/).

## Installation

```bash
# npm
npm install @effectify/react-query

# yarn
yarn add @effectify/react-query

# pnpm
pnpm add @effectify/react-query

# bun
bun add @effectify/react-query
```

## Basic Usage

```tsx
import * as Layer from "effect/Layer"
import * as Effect from "effect/Effect"
import { QueryClient } from "@tanstack/react-query"
import { tanstackQueryEffect } from "@effectify/react-query"

// Create an Effect layer
const AppLayer = Layer.succeed("AppConfig", { apiUrl: "https://api.example.com" })

// Create a QueryClient instance
const queryClient = new QueryClient()

// Initialize the TanStack Query integration
const {
  RuntimeProvider,
  useRuntime,
  useEffectQuery,
  useEffectMutation,
  useRxSubscribe,
  useRxSubscriptionRef,
} = tanstackQueryEffect({ layer: AppLayer, queryClient })

// Wrap your application with the provider
function App() {
  return (
    <RuntimeProvider>
      <YourApp />
    </RuntimeProvider>
  )
}

// Use in components
function YourComponent() {
  const query = useEffectQuery({
    queryKey: ["data"],
    queryFn: () => Effect.succeed(["item1", "item2"]),
  })

  return (
    <div>
      {query.isPending ? <p>Loading...</p> : query.isError ? <p>Error: {query.error.message}</p> : (
        <ul>
          {query.data.map((item) => <li>{item}</li>)}
        </ul>
      )}
    </div>
  )
}
```

## API

### `tanstackQueryEffect({ layer, queryClient })`

Creates an instance of the TanStack Query integration.

#### Parameters

- `layer`: An Effect layer that provides the necessary dependencies.
- `queryClient`: A TanStack Query QueryClient instance.

#### Returns

An object with the following properties:

- `RuntimeProvider`: Provider component that should wrap your application.
- `useRuntime`: Hook to access the Effect runtime.
- `useEffectQuery`: Hook to perform queries with Effect.
- `useEffectMutation`: Hook to perform mutations with Effect.
- `useRxSubscribe`: Hook to subscribe to Effect streams.
- `useRxSubscriptionRef`: Hook to maintain a reference to a subscription.

### Helpers

- `createQueryDataHelpers`: Utility to create query data manipulation helpers.
- `createQueryKey`: Utility to create typed query keys.

## Complete Example

Check out the example application in [apps/tanstack-react-app](../../apps/tanstack-react-app) to see a complete use case.

## Credits & Inspiration

This package was inspired by the excellent educational content from [Lucas Barake](https://www.youtube.com/@lucas-barake), particularly his [video on Effect and TanStack Query](https://www.youtube.com/watch?v=zl4w3BQAoJM&t=1011s) which provides great insights into these technologies.

## License

MIT
