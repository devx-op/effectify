import * as Data from "effect/Data"
import * as Schema from "effect/Schema"
import { setErrorCause } from "./internal/error-cause.js"

export class MissingTaskError extends Data.TaggedError("MissingTaskError")<{
  readonly taskName: string
}> {}

export class TaskSchemaError extends Data.TaggedError("TaskSchemaError")<{
  readonly taskName: string
  readonly phase: "input" | "output"
  readonly issue: unknown
}> {}

export class InvalidHatchetConfiguration extends Schema.TaggedErrorClass<InvalidHatchetConfiguration>()(
  "InvalidHatchetConfiguration",
  {
    field: Schema.String,
    message: Schema.String,
  },
) {}

export const HatchetFailureReason = Schema.Literals([
  "NotConfigured",
  "Unauthorized",
  "Unavailable",
  "InvalidResponse",
  "Disposed",
  "Unknown",
])
export type HatchetFailureReason = typeof HatchetFailureReason.Type

const statusOf = (cause: unknown): number | undefined => {
  if (typeof cause !== "object" || cause === null) return undefined
  if ("status" in cause && typeof cause.status === "number") {
    return cause.status
  }
  if (
    "response" in cause &&
    typeof cause.response === "object" &&
    cause.response !== null &&
    "status" in cause.response &&
    typeof cause.response.status === "number"
  ) {
    return cause.response.status
  }
  return undefined
}

const classifyFailure = (
  operation: string,
  cause: unknown,
): HatchetFailureReason => {
  if (
    typeof cause === "object" &&
    cause !== null &&
    "reason" in cause &&
    Schema.is(HatchetFailureReason)(cause.reason)
  ) {
    return cause.reason
  }
  const status = statusOf(cause)
  if (status === 401 || status === 403) return "Unauthorized"
  if (
    status === 408 ||
    status === 429 ||
    (status !== undefined && status >= 500)
  ) {
    return "Unavailable"
  }
  if (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    ["ECONNREFUSED", "ECONNRESET", "ENETUNREACH", "ETIMEDOUT"].includes(
      String(cause.code),
    )
  ) {
    return "Unavailable"
  }
  if (
    operation === "config.config" ||
    (operation.startsWith("config") &&
      cause instanceof Error &&
      /missing|required|token|config/i.test(cause.message))
  ) {
    return "NotConfigured"
  }
  if (!(cause instanceof Error) && /output|schedule|cron/.test(operation)) {
    return "InvalidResponse"
  }
  return "Unknown"
}

export class HatchetConfigError extends Data.TaggedError("HatchetConfigError")<{
  readonly field: string
  readonly reason: HatchetFailureReason
}> {
  constructor(args: {
    readonly field: string
    readonly originalCause: unknown
  }) {
    super({
      field: args.field,
      reason: classifyFailure(`config.${args.field}`, args.originalCause),
    })
    setErrorCause(this, args.originalCause)
  }
}

export class HatchetSdkError extends Data.TaggedError("HatchetSdkError")<{
  readonly operation: string
  readonly resourceId?: string
  readonly reason: HatchetFailureReason
}> {
  constructor(args: {
    readonly operation: string
    readonly resourceId?: string
    readonly originalCause: unknown
  }) {
    super({
      operation: args.operation,
      ...(args.resourceId === undefined ? {} : { resourceId: args.resourceId }),
      reason: classifyFailure(args.operation, args.originalCause),
    })
    setErrorCause(this, args.originalCause)
  }
}

/** Classifies package and SDK failures without exposing implementation causes. */
export const failureReason = (cause: unknown): HatchetFailureReason => classifyFailure("operation", cause)

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
