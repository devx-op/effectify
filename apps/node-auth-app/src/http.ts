import { createServer } from 'node:http'
import * as HttpMiddleware from '@effect/platform/HttpMiddleware'
import * as HttpRouter from '@effect/platform/HttpRouter'
import * as HttpServer from '@effect/platform/HttpServer'
import * as NodeHttpServer from '@effect/platform-node/NodeHttpServer'
import { toEffectHandler } from '@effectify/node-better-auth'
import * as Layer from 'effect/Layer'
import * as Auth from './auth.js'

// Create the http server
export const Live = HttpRouter.empty.pipe(
  HttpRouter.all('/api/auth/*', toEffectHandler(Auth.auth)),
  HttpServer.serve(HttpMiddleware.logger),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3001 })),
)
