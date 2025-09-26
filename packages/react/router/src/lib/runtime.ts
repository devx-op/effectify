import * as T from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { pipe } from 'effect/Function'
import type * as Layer from 'effect/Layer'
import * as Logger from 'effect/Logger'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import { type ActionFunctionArgs, data, type LoaderFunctionArgs, redirect } from 'react-router'
import { ActionArgsContext, LoaderArgsContext } from '@/lib/context.js'
import { type HttpResponse, matchHttpResponse } from '@/lib/http-response.js'

export const make = <R, E>(layer: Layer.Layer<R, E, never>) => {
  const runtime = ManagedRuntime.make(layer)

  const withLoaderEffect =
    <A, B>(self: T.Effect<HttpResponse<A>, B, R | LoaderArgsContext>) =>
    (args: LoaderFunctionArgs) => {
      const runnable = pipe(self, T.provide(Logger.pretty), T.provideService(LoaderArgsContext, args))
      return runtime.runPromiseExit(runnable).then(
        Exit.match({
          onFailure: (cause) => {
            console.error(cause)
            if (cause._tag === 'Fail') {
              throw pipe(cause.error)
            }
            // biome-ignore lint/style/useThrowOnlyError: <library uses non-Error throws>
            throw { ok: false as const, errors: ['Something went wrong'] }
          },
          onSuccess: matchHttpResponse<A>()({
            Ok: ({ data: response }) => {
              return { ok: true as const, data: response }
            },
            Redirect: ({ to, init = {} }) => {
              redirect(to, init)
              return { ok: false as const, errors: ['Redirecting...'] }
            },
          }),
        }),
      )
    }

  // Don't throw the Error requests, handle them in the normal UI. No ErrorBoundary
  const withActionEffect =
    <A, B>(self: T.Effect<HttpResponse<A>, B, R>) =>
    (args: ActionFunctionArgs) => {
      const runnable = pipe(
        self,
        T.provide(Logger.pretty),
        T.provideService(ActionArgsContext, args),
        T.match({
          onFailure: (errors) => data({ ok: false as const, errors }, { status: 400 }),
          onSuccess: matchHttpResponse<A>()({
            Ok: ({ data: response }) => {
              return { ok: true as const, response }
            },
            Redirect: ({ to, init = {} }) => {
              return redirect(to, init)
            },
          }),
        }),
      )

      return runtime.runPromise(runnable)
    }

  return { withLoaderEffect, withActionEffect }
}
