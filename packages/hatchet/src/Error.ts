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
