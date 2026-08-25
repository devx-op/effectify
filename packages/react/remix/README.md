# @effectify/react-remix

> **Deprecated:** this package is a temporary React Router 7 bridge pinned to the exact 7.18.2 family. New applications must use [`@effectify/react-router`](../router/README.md) on React Router 8.3.0. Follow the [migration and retirement ledger](../../../docs/migrations/react-remix-to-react-router.md).

The bridge keeps the existing Effect-facing loader/action contract available only while repository consumers and example scenarios complete the reviewed migration gate. It does not support React Router 8 and is not a permanently co-maintained integration.

Final supported rollback version: `@effectify/react-remix@0.5.12-alpha.1`.

## Install for an existing bridge consumer

```bash
pnpm add @effectify/react-remix@0.5.12-alpha.1 react-router@7.18.2
```

Do not select this package for new work. The app-local RR7 Better Auth adapter is workspace-only and is never published.

## Existing bridge API

```ts
import {
  ActionArgsContext,
  LoaderArgsContext,
  httpFailure,
  httpRedirect,
  httpSuccess,
} from "@effectify/react-remix"
import { Runtime } from "@effectify/react-remix"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

const { withLoaderEffect, withActionEffect } = Runtime.make(Layer.empty)

export const loader = withLoaderEffect(
  Effect.gen(function*() {
    const { request } = yield* LoaderArgsContext
    return yield* httpSuccess({ url: request.url })
  }),
)

export const action = withActionEffect(
  Effect.gen(function*() {
    yield* ActionArgsContext
    return yield* httpRedirect("/", { status: 303 })
  }),
)
```

The bridge preserves successful loader/action shapes, modeled failure statuses, redirect headers, and exact failed `Response` / `Error` identity. `LoaderArgsContext` and `ActionArgsContext` are bridge-owned Effect services; RR8 or structurally similar context classes cannot replace them.

## Legacy `json`

The bridge-only `json(data, init)` export remains available during the support window. Replace it during migration:

```ts
// Before
import { json } from "@effectify/react-remix"
const response = json(data, 201)

// After
const response = Response.json(data, { status: 201 })
```

`@effectify/react-router` intentionally does not export `json`.

## Migrate and verify

Use the [migration guide](../../../docs/migrations/react-remix-to-react-router.md) for import, command, context, runtime, JSON, Better Auth, consumer, and scenario guidance. Retirement remains blocked until its validator reports `OPEN`; until then this package and its exact rollback version remain available.

## License

MIT
