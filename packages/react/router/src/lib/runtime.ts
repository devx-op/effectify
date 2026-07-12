import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "react-router"
import { ActionArgsContext, LoaderArgsContext } from "./context.js"
import { type HttpResponse, matchHttpResponse } from "./http-response.js"

const jsonResponse = (body: unknown, status: number) => Response.json(body, { status })

const failure = <E>(cause: Cause.Cause<E>): E | undefined => {
  for (const reason of cause.reasons) {
    if (Cause.isFailReason(reason)) return reason.error
  }
  return undefined
}

export const make = <R, E>(layer: Layer.Layer<R, E, never>) => {
  const runtime = ManagedRuntime.make(layer)

  const withLoaderEffect = <A, B>(
    self: Effect.Effect<HttpResponse<A> | Response, B, R | LoaderArgsContext>,
  ) =>
  (args: LoaderFunctionArgs) => {
    const runnable = pipe(
      self,
      Effect.provide(Layer.succeed(LoaderArgsContext)(args)),
      Effect.tapCause((cause) => Effect.logError("Loader effect failed", Cause.squash(cause))),
    )
    return runtime.runPromiseExit(runnable).then(
      Exit.match({
        onFailure: (cause) => {
          const error = failure(cause)
          if (error instanceof Response || error instanceof Error) {
            throw error
          }
          throw jsonResponse(
            { ok: false, errors: ["Internal server error"] },
            500,
          )
        },
        onSuccess: (result) => {
          if (result instanceof Response) throw result
          return matchHttpResponse<A>()({
            HttpResponseSuccess: ({ data }) => ({ ok: true as const, data }),
            HttpResponseFailure: ({ cause }) => {
              throw jsonResponse({ ok: false, errors: [String(cause)] }, 500)
            },
            HttpResponseRedirect: ({ to, init = {} }) => redirect(to, init),
          })(result)
        },
      }),
    )
  }

  const withActionEffect = <A, B>(
    self: Effect.Effect<HttpResponse<A> | Response, B, R | ActionArgsContext>,
  ) =>
  (args: ActionFunctionArgs) => {
    const runnable = pipe(
      self,
      Effect.provide(Layer.succeed(ActionArgsContext)(args)),
      Effect.tapCause((cause) => Effect.logError("Action effect failed", Cause.squash(cause))),
    )
    return runtime.runPromiseExit(runnable).then(
      Exit.match({
        onFailure: (cause) => {
          const error = failure(cause)
          if (error instanceof Response || error instanceof Error) {
            throw error
          }
          return jsonResponse(
            { ok: false, errors: ["Internal server error"] },
            400,
          )
        },
        onSuccess: (result) => {
          if (result instanceof Response) throw result
          return matchHttpResponse<A>()({
            HttpResponseSuccess: ({ data }) => ({
              ok: true as const,
              response: data,
            }),
            HttpResponseFailure: ({ cause }) => jsonResponse({ ok: false, errors: [String(cause)] }, 400),
            HttpResponseRedirect: ({ to, init = {} }) => redirect(to, init),
          })(result)
        },
      }),
    )
  }

  return { withLoaderEffect, withActionEffect }
}
