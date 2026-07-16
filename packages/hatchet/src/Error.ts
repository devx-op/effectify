import * as Data from "effect/Data"

export class DuplicateTaskError extends Data.TaggedError("DuplicateTaskError")<{
  readonly taskName: string
}> {}

export class MissingTaskError extends Data.TaggedError("MissingTaskError")<{
  readonly taskName: string
}> {}

export class TaskSchemaError extends Data.TaggedError("TaskSchemaError")<{
  readonly taskName: string
  readonly phase: "input" | "output"
  readonly issue: unknown
}> {}

export class HatchetConfigError extends Data.TaggedError("HatchetConfigError")<{
  readonly field: string
  readonly originalCause: unknown
}> {}

export class HatchetSdkError extends Data.TaggedError("HatchetSdkError")<{
  readonly operation: string
  readonly resourceId?: string
  readonly originalCause: unknown
}> {}

export class InvalidTimeError extends Data.TaggedError("InvalidTimeError")<{
  readonly field: "at" | "delay"
  readonly originalCause: unknown
}> {}

export class InvalidCronError extends Data.TaggedError("InvalidCronError")<{
  readonly field: "name" | "expression" | "input" | "priority"
  readonly originalCause: unknown
}> {}

export class InvalidCronFilterError extends Data.TaggedError(
  "InvalidCronFilterError",
)<{
  readonly field: "taskName" | "name" | "offset" | "limit"
  readonly originalCause: unknown
}> {}

export class WorkerAlreadyStartedError extends Data.TaggedError(
  "WorkerAlreadyStartedError",
)<{
  readonly taskName: string
  readonly workerName: string
}> {}
