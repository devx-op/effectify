/**
 * @effectify/hatchet - Core Error Types
 *
 * Error types for Hatchet integration using Effect v4 Data.TaggedError
 */

import * as Data from "effect/Data"

/**
 * Base error class for all Hatchet-related errors
 * Uses Data.TaggedError for discriminated error handling
 */
export class HatchetError extends Data.TaggedError("HatchetError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Error when Hatchet SDK initialization fails
 */
export class HatchetInitError extends Data.TaggedError("HatchetInitError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Error when workflow/task execution fails
 */
export class HatchetExecutionError extends Data.TaggedError(
  "HatchetExecutionError",
)<{
  readonly message: string
  readonly taskName?: string
  readonly cause?: unknown
}> {}

/**
 * Error when worker registration fails
 */
export class HatchetWorkerError extends Data.TaggedError("HatchetWorkerError")<{
  readonly message: string
  readonly workerName?: string
  readonly cause?: unknown
}> {}

/**
 * Error when context operations fail
 */
export class HatchetContextError extends Data.TaggedError(
  "HatchetContextError",
)<{
  readonly message: string
  readonly operation: "input" | "parentOutput" | "log"
  readonly cause?: unknown
}> {}

/**
 * Error when a workflow run fails
 */
export class HatchetRunError extends Data.TaggedError("HatchetRunError")<{
  readonly message: string
  readonly workflow?: string
  readonly runId?: string
  readonly cause?: unknown
}> {}

/**
 * Error when an observability operation fails
 */
export class HatchetObservabilityError extends Data.TaggedError(
  "HatchetObservabilityError",
)<{
  readonly message: string
  readonly operation: "logs" | "metrics"
  readonly endpoint: string
  readonly taskId?: string
  readonly tenantId?: string
  readonly cause?: unknown
}> {}

/**
 * Error when an observability operation fails
 */
export class HatchetObservabilityError extends Data.TaggedError(
  "HatchetObservabilityError",
)<{
  readonly message: string
  readonly operation: "logs" | "metrics"
  readonly endpoint: string
  readonly taskId?: string
  readonly tenantId?: string
  readonly cause?: unknown
}> {}

/**
 * Error when a workflow operation fails (create, get, list)
 */
export class HatchetWorkflowError extends Data.TaggedError(
  "HatchetWorkflowError",
)<{
  readonly message: string
  readonly workflowName?: string
  readonly cause?: unknown
}> {}

/**
 * Error when an event operation fails
 */
export class HatchetEventError extends Data.TaggedError("HatchetEventError")<{
  readonly message: string
  readonly key?: string
  readonly eventId?: string
  readonly cause?: unknown
}> {}

/**
 * Error when a schedule operation fails
 */
export class HatchetScheduleError extends Data.TaggedError(
  "HatchetScheduleError",
)<{
  readonly message: string
  readonly scheduleId?: string
  readonly workflowName?: string
  readonly cause?: unknown
}> {}

/**
 * Error when a cron operation fails
 */
export class HatchetCronError extends Data.TaggedError("HatchetCronError")<{
  readonly message: string
  readonly cronId?: string
  readonly workflowName?: string
  readonly cause?: unknown
}> {}

/**
 * Error when a webhook operation fails
 */
export class HatchetWebhookError extends Data.TaggedError(
  "HatchetWebhookError",
)<{
  readonly message: string
  readonly operation: "list" | "get" | "create" | "update" | "delete"
  readonly webhookName?: string
  readonly cause?: unknown
}> {}

/**
 * Error when a rate-limit operation fails
 */
export class HatchetRateLimitError extends Data.TaggedError(
  "HatchetRateLimitError",
)<{
  readonly message: string
  readonly operation: "list" | "upsert"
  readonly key?: string
  readonly cause?: unknown
}> {}

/**
 * Error when a filter operation fails
 */
export class HatchetFilterError extends Data.TaggedError("HatchetFilterError")<{
  readonly message: string
  readonly operation: "list" | "create" | "get" | "delete"
  readonly filterId?: string
  readonly workflowId?: string
  readonly cause?: unknown
}> {}
