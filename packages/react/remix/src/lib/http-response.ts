import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Match from "effect/Match"

// Use standard ResponseInit from lib.dom.d.ts instead of @effect/platform-node/Undici

/** @deprecated Temporary RR7 bridge model; migrate to `@effectify/react-router`. */
export class HttpResponseSuccess<T> extends Data.TaggedClass("HttpResponseSuccess")<{
  readonly data: T
}> {}

/** @deprecated Temporary RR7 bridge model; migrate to `@effectify/react-router`. */
export class HttpResponseFailure<T = unknown> extends Data.TaggedClass("HttpResponseFailure")<{
  readonly cause: T
}> {}

/** @deprecated Temporary RR7 bridge model; migrate to `@effectify/react-router`. */
export class HttpResponseRedirect extends Data.TaggedClass("HttpResponseRedirect")<{
  readonly to: string
  readonly init?: number | ResponseInit | undefined
}> {}

/** @deprecated Temporary RR7 bridge type; migrate to `@effectify/react-router`. */
export type HttpResponse<T> = HttpResponseRedirect | HttpResponseSuccess<T> | HttpResponseFailure<unknown>

/** @deprecated Temporary RR7 bridge matcher; migrate to `@effectify/react-router`. */
export const matchHttpResponse = <T>() => Match.typeTags<HttpResponse<T>>()

// Helper functions for better DX
/** @deprecated Temporary RR7 bridge helper; migrate to `@effectify/react-router`. */
export const httpSuccess = <T>(data: T): Effect.Effect<HttpResponseSuccess<T>, never, never> =>
  Effect.succeed(new HttpResponseSuccess({ data }))

/** @deprecated Temporary RR7 bridge helper; migrate to `@effectify/react-router`. */
export const httpFailure = <T = unknown>(cause: T): Effect.Effect<HttpResponseFailure<T>, never, never> =>
  Effect.succeed(new HttpResponseFailure({ cause }))

/** @deprecated Temporary RR7 bridge helper; migrate to `@effectify/react-router`. */
export const httpRedirect = (
  to: string,
  init?: number | ResponseInit,
): Effect.Effect<HttpResponseRedirect, never, never> => Effect.succeed(new HttpResponseRedirect({ to, init }))
