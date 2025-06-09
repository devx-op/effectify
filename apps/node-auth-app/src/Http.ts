import * as NodeHttpServer from '@effect/platform-node/NodeHttpServer'
import * as HttpMiddleware from '@effect/platform/HttpMiddleware'
import * as HttpRouter from '@effect/platform/HttpRouter'
import * as HttpServer from '@effect/platform/HttpServer'
import * as Layer from 'effect/Layer'
import * as Auth from './Auth.js'

import { createServer } from 'node:http'
import { toEffectHandler } from '@effectify/node-better-auth'

// Create the http server
export const Live = HttpRouter.empty.pipe(
  HttpRouter.all('/api/auth/*', toEffectHandler(Auth.handler)),
  HttpServer.serve(HttpMiddleware.logger),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
)
