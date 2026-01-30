import * as Data from "effect/Data"
export class BetterAuthApiError extends Data.TaggedError("BetterAuthApiError")<{
  cause: unknown
}> {}
