import { Data } from "effect"

export class MissingMountedRangeParentError extends Data.TaggedError("MissingMountedRangeParentError") {}

export class MismatchedMountedRangeParentError extends Data.TaggedError("MismatchedMountedRangeParentError") {}

export class DuplicateControlFlowKeyError extends Data.TaggedError("DuplicateControlFlowKeyError") {}
