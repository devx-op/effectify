# @effectify/node-better-auth

Integration of [better-auth](https://github.com/lucasavila00/better-auth) with [Effect](https://effect.website/) for Node.js applications.

## Installation

```bash
# npm
npm install @effectify/node-better-auth

# yarn
yarn add @effectify/node-better-auth

# pnpm
pnpm add @effectify/node-better-auth

# bun
bun add @effectify/node-better-auth
```

## Basic Usage

```typescript
// Auth.js
import { betterAuth } from 'better-auth'
import Database from 'better-sqlite3'

export const handler = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  database: new Database('../sqlite.db') as any,
})

// Main.ts
import * as Auth from '@/Auth.js'
import * as NodeHttpServer from '@effect/platform-node/NodeHttpServer'
import * as HttpMiddleware from '@effect/platform/HttpMiddleware'
import * as HttpRouter from '@effect/platform/HttpRouter'
import * as HttpServer from '@effect/platform/HttpServer'
import * as Layer from 'effect/Layer'
import * as NodeRuntime from '@effect/platform-node/NodeRuntime'

import { createServer } from 'node:http'
import { toEffectHandler } from '@effectify/node-better-auth'

export const Live = HttpRouter.empty.pipe(
  HttpRouter.all('/api/auth/*', toEffectHandler(Auth.handler)),
  HttpServer.serve(HttpMiddleware.logger),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

Layer.launch(Live).pipe(NodeRuntime.runMain())
```

## API

### `toEffectHandler(auth)`

Converts a better-auth handler to an Effect-based HTTP handler.

#### Parameters

- `auth`: A better-auth handler or an object containing a better-auth handler.

#### Returns

An Effect that handles HTTP requests for authentication.

## Requirements

- Node.js
- Effect ecosystem (`effect`, `@effect/platform`, `@effect/platform-node`)
- better-auth

## License

MIT