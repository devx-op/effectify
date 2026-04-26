import { Data } from "effect"

export class MissingMountedRangeParentError extends Data.TaggedError("MissingMountedRangeParentError")<{
  readonly owner: string
}> {}

export class MismatchedMountedRangeParentError extends Data.TaggedError("MismatchedMountedRangeParentError")<{
  readonly owner: string
}> {}

export class DuplicateControlFlowKeyError extends Data.TaggedError("DuplicateControlFlowKeyError")<{
  readonly owner: string
  readonly key: PropertyKey
}> {}
