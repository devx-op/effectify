import { type ActionFunctionArgs, json, type LoaderFunctionArgs, redirect } from "@remix-run/node"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import { ActionArgsContext, LoaderArgsContext } from "./context.js"
import { type HttpResponse, matchHttpResponse } from "./http-response.js"

// Safe type for redirect init parameter to avoid undici/undici-types conflicts
type SafeRedirectInit = {
  status?: number
  statusText?: string
  headers?: Record<string, string> | Headers
}

const failure = <E>(cause: Cause.Cause<E>): E | undefined => {
  for (const reason of cause.reasons) {
    if (Cause.isFailReason(reason)) return reason.error
  }
  return undefined
}

export const make = <R, E>(layer: Layer.Layer<R, E, never>) => {
  const runtime = ManagedRuntime.make(layer)

  const withLoaderEffect =
    <A, B, R0 extends R | LoaderArgsContext>(self: Effect.Effect<HttpResponse<A> | Response, B, R0>) =>
    (args: LoaderFunctionArgs) => {
      const runnable = pipe(
        self,
        Effect.provide(Layer.succeed(LoaderArgsContext, args)),
        Effect.tapCause((cause) => Effect.logError("Loader effect failed", Cause.squash(cause))),
      )
      return runtime.runPromiseExit(runnable).then(
        Exit.match({
          onFailure: (cause) => {
            const error = failure(cause)
            if (error instanceof Response || error instanceof Error) {
              throw error
            }
            throw json({ ok: false as const, errors: ["Internal server error"] }, { status: 500 })
          },
          onSuccess: (result) => {
            if (result instanceof Response) throw result
            return matchHttpResponse<A>()({
              HttpResponseSuccess: ({ data }) => ({ ok: true as const, data }),
              HttpResponseFailure: ({ cause }) => {
                throw json({ ok: false as const, errors: [String(cause)] }, { status: 500 })
              },
              HttpResponseRedirect: ({ to, init = {} }) => redirect(to, init as SafeRedirectInit),
            })(result)
          },
        }),
      )
    }

  const withActionEffect =
    <A, B, R0 extends R | ActionArgsContext>(self: Effect.Effect<HttpResponse<A> | Response, B, R0>) =>
    (args: ActionFunctionArgs) => {
      const runnable = pipe(
        self,
        Effect.provide(Layer.succeed(ActionArgsContext, args)),
        Effect.tapCause((cause) => Effect.logError("Action effect failed", Cause.squash(cause))),
      )

      return runtime.runPromiseExit(runnable).then(
        Exit.match({
          onFailure: (cause) => {
            const error = failure(cause)
            if (error instanceof Response || error instanceof Error) {
              throw error
            }
            return json({ ok: false as const, errors: ["Internal server error"] }, { status: 400 })
          },
          onSuccess: (result) => {
            if (result instanceof Response) throw result
            return matchHttpResponse<A>()({
              HttpResponseSuccess: ({ data }) => ({
                ok: true as const,
                response: data,
              }),
              HttpResponseFailure: ({ cause }) =>
                json({ ok: false as const, errors: [String(cause)] }, { status: 400 }),
              HttpResponseRedirect: ({ to, init = {} }) => redirect(to, init as SafeRedirectInit),
            })(result)
          },
        }),
      )
    }

  return { withLoaderEffect, withActionEffect }
}
