import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'

export class HttpResponseSuccess<T> extends Data.TaggedClass('HttpResponseSuccess')<{
  readonly data: T
}> {}

export class HttpResponseFailure<T = unknown> extends Data.TaggedClass('HttpResponseFailure')<{
  readonly cause: T
}> {}

export class HttpResponseRedirect extends Data.TaggedClass('HttpResponseRedirect')<{
  readonly to: string
  readonly init?: number | ResponseInit | undefined
}> {}

export type HttpResponse<T> = HttpResponseRedirect | HttpResponseSuccess<T> | HttpResponseFailure<unknown>

export const matchHttpResponse = <T>() => Match.typeTags<HttpResponse<T>>()

// Helper functions for better DX
export const httpSuccess = <T>(data: T): Effect.Effect<HttpResponseSuccess<T>, never, never> =>
  Effect.succeed(new HttpResponseSuccess({ data }))

export const httpFailure = <T = unknown>(cause: T): Effect.Effect<HttpResponseFailure<T>, never, never> =>
  Effect.succeed(new HttpResponseFailure({ cause }))

export const httpRedirect = (
  to: string,
  init?: number | ResponseInit,
): Effect.Effect<HttpResponseRedirect, never, never> => Effect.succeed(new HttpResponseRedirect({ to, init }))
