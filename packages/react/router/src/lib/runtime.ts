import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { pipe } from 'effect/Function'
import type * as Layer from 'effect/Layer'
import * as Logger from 'effect/Logger'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import { type ActionFunctionArgs, data, type LoaderFunctionArgs, redirect } from 'react-router'
import { ActionArgsContext, LoaderArgsContext } from '../lib/context.js'
import { type HttpResponse, matchHttpResponse } from '../lib/http-response.js'

export const make = <R, E>(layer: Layer.Layer<R, E, never>) => {
  const runtime = ManagedRuntime.make(layer)

  const withLoaderEffect =
    <A, B>(self: Effect.Effect<HttpResponse<A> | Response, B, R | LoaderArgsContext>) =>
    (args: LoaderFunctionArgs) => {
      const runnable = pipe(
        self,
        Effect.provide(Logger.pretty),
        Effect.provideService(LoaderArgsContext, args),
        Effect.tapError((cause) => Effect.logError('Loader effect failed', cause)),
      )
      return runtime.runPromiseExit(runnable).then(
        Exit.match({
          onFailure: (cause) => {
            if (cause._tag === 'Fail') {
              // Preserve the original error for ErrorBoundary
              const error = cause.error
              if (error instanceof Response) {
                throw error
              }
              if (error instanceof Error) {
                throw error
              }
              // Convert other errors to Response for ErrorBoundary with ok: false
              const errorData = { ok: false as const, errors: [String(error)] }
              throw new Response(JSON.stringify(errorData), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
              })
            }
            // Handle other types of failures (interrupts, defects, etc.)
            const errorData = { ok: false as const, errors: ['Internal server error'] }
            throw new Response(JSON.stringify(errorData), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            })
          },
          onSuccess: (result) => {
            // If the result is a Response, throw it directly to preserve headers (including Set-Cookie)
            // This is how React Router expects to handle Responses from loaders/actions
            if (result instanceof Response) {
              throw result
            }
            // Otherwise, match the HttpResponse types
            return matchHttpResponse<A>()({
              HttpResponseSuccess: ({ data: response }) => ({ ok: true as const, data: response }),
              HttpResponseFailure: ({ cause }) => {
                // Convert HttpResponseFailure to Response for ErrorBoundary with ok: false
                const errorMessage = typeof cause === 'string' ? cause : String(cause)
                const errorData = { ok: false as const, errors: [errorMessage] }
                throw new Response(JSON.stringify(errorData), {
                  status: 500,
                  headers: { 'Content-Type': 'application/json' },
                })
              },
              HttpResponseRedirect: ({ to, init = {} }) => {
                redirect(to, init)
                return { ok: false as const, errors: ['Redirecting...'] }
              },
            })(result)
          },
        }),
      )
    }

  // Don't throw the Error requests, handle them in the normal UI. No ErrorBoundary
  const withActionEffect =
    <A, B>(self: Effect.Effect<HttpResponse<A> | Response, B, R | ActionArgsContext>) =>
    (args: ActionFunctionArgs) => {
      const runnable = pipe(
        self,
        Effect.provide(Logger.pretty),
        Effect.provideService(ActionArgsContext, args),
        Effect.tapError((cause) => {
          // Don't log if it's a Response - that's expected behavior
          if (!(cause instanceof Response)) {
            return Effect.logError('Action effect failed', cause)
          }
          return Effect.void
        }),
      )

      return runtime.runPromiseExit(runnable).then(
        Exit.match({
          onFailure: (cause) => {
            if (cause._tag === 'Fail') {
              const error = cause.error
              // If the error is a Response, throw it directly to preserve headers
              if (error instanceof Response) {
                throw error
              }
              return data({ ok: false as const, errors: [String(error)] }, { status: 400 })
            }
            // Handle other types of failures
            return data({ ok: false as const, errors: ['Internal server error'] }, { status: 400 })
          },
          onSuccess: (result) => {
            // If the result is a Response, throw it directly to preserve headers (including Set-Cookie)
            // This is how React Router expects to handle Responses from actions
            if (result instanceof Response) {
              throw result
            }
            // Otherwise, match the HttpResponse types
            return matchHttpResponse<A>()({
              HttpResponseSuccess: ({ data: response }) => ({ ok: true as const, response }),
              HttpResponseFailure: ({ cause }) =>
                data({ ok: false as const, errors: [String(cause)] }, { status: 400 }),
              HttpResponseRedirect: ({ to, init = {} }) => redirect(to, init),
            })(result)
          },
        }),
      )
    }

  return { withLoaderEffect, withActionEffect }
}
