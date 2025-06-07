import * as NodeHttpServerRequest from '@effect/platform-node/NodeHttpServerRequest'
import * as HttpServerRequest from '@effect/platform/HttpServerRequest'
import * as HttpServerResponse from '@effect/platform/HttpServerResponse'
import * as Config from 'effect/Config'
import * as T from 'effect/Effect'

import type { Auth } from 'better-auth'
import { toNodeHandler } from 'better-auth/node'
import type { ConfigError } from 'effect/ConfigError'
import { BetterAuthApiError } from './better-auth-error.js'

export const toEffectHandler: (
  auth:
    | {
        handler: Auth['handler']
      }
    | Auth['handler'],
) => T.Effect<
  HttpServerResponse.HttpServerResponse,
  BetterAuthApiError | ConfigError,
  HttpServerRequest.HttpServerRequest
> = (auth) =>
  T.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const nodeRequest = NodeHttpServerRequest.toIncomingMessage(request)
    const nodeResponse = NodeHttpServerRequest.toServerResponse(request)

    const appUrl = yield* Config.string('APP_URL')

    const allowedOrigins = [appUrl]
    const origin = nodeRequest.headers.origin ?? ''
    if (allowedOrigins.includes(origin)) {
      nodeResponse.setHeader('Access-Control-Allow-Origin', origin)
      nodeResponse.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      nodeResponse.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      nodeResponse.setHeader('Access-Control-Max-Age', '600')
      nodeResponse.setHeader('Access-Control-Allow-Credentials', 'true')
    }

    yield* T.tryPromise({
      try: () =>
        'handler' in auth
          ? toNodeHandler(auth.handler)(nodeRequest, nodeResponse)
          : toNodeHandler(auth)(nodeRequest, nodeResponse),
      catch: (cause) => {
        console.log(cause)
        return new BetterAuthApiError({ cause })
      },
    })

    return HttpServerResponse.empty({
      status: nodeResponse.writableFinished ? nodeResponse.statusCode : 499,
    })
  })
