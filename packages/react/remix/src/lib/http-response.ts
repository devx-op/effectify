import * as Data from 'effect/Data'
import * as Match from 'effect/Match'

export class Ok<T> extends Data.TaggedClass('Ok')<{
  readonly data: T
}> {}

export class Redirect extends Data.TaggedClass('Redirect')<{
  readonly to: string
  readonly init?: number | ResponseInit | undefined
}> {}

export type HttpResponse<T> = Redirect | Ok<T>
export const matchHttpResponse = <T>() => Match.typeTags<HttpResponse<T>>()
