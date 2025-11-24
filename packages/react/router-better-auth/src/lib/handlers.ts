import { AuthService } from '@effectify/node-better-auth'
import { ActionArgsContext, LoaderArgsContext } from '@effectify/react-router'
import * as Effect from 'effect/Effect'

const getRequest = (context: typeof LoaderArgsContext) => Effect.map(context, (args) => args.request)
const getRequestFromAction = (context: typeof ActionArgsContext) => Effect.map(context, (args) => args.request)

const withAuthHandler = <E, R>(requestEffect: Effect.Effect<Request, E, R>) =>
  Effect.all([requestEffect, AuthService.AuthServiceContext]).pipe(
    Effect.andThen(([request, auth]) =>
      Effect.gen(function* () {
        return yield* Effect.promise(() => auth.auth.handler(request))
      }),
    ),
  )

export const betterAuthLoader = LoaderArgsContext.pipe(getRequest, withAuthHandler)

export const betterAuthAction = ActionArgsContext.pipe(getRequestFromAction, withAuthHandler)
