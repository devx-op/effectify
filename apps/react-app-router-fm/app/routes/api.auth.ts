import { ActionArgsContext, LoaderArgsContext } from '@effectify/react-router'
import * as Effect from 'effect/Effect'
import { withActionEffect, withLoaderEffect } from '../lib/runtime.server.js'
import { AuthService } from '../lib/auth.server.js'

const getRequest = (context: typeof LoaderArgsContext) =>
  Effect.map(context, (args) => args.request)
const getRequestFromAction = (context: typeof ActionArgsContext) =>
  Effect.map(context, (args) => args.request)

const withAuthHandler = <E, R>(requestEffect: Effect.Effect<Request, E, R>) =>
  Effect.all([requestEffect, AuthService]).pipe(
    Effect.andThen(([request, auth]) =>
      Effect.gen(function* () {
        return yield* Effect.promise(() => auth.handler(request))
      }),
    ),
  )

export const loader = LoaderArgsContext
  .pipe(
    getRequest,
    withAuthHandler,
    withLoaderEffect,
  )

export const action = ActionArgsContext
  .pipe(
    getRequestFromAction,
    withAuthHandler, 
    withActionEffect,
  )