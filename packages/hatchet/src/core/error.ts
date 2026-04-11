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
}> {
  /**
   * Create a new HatchetError
   */
  static of(message: string, cause?: unknown): HatchetError {
    return new HatchetError({ message, cause })
  }
}

/**
 * Error when Hatchet SDK initialization fails
 */
export class HatchetInitError extends Data.TaggedError("HatchetInitError")<{
  readonly message: string
  readonly cause?: unknown
}> {
  static of(message: string, cause?: unknown): HatchetInitError {
    return new HatchetInitError({ message, cause })
  }
}

/**
 * Error when workflow/task execution fails
 */
export class HatchetExecutionError extends Data.TaggedError(
  "HatchetExecutionError",
)<{
  readonly message: string
  readonly taskName?: string
  readonly cause?: unknown
}> {
  static of(
    message: string,
    taskName?: string,
    cause?: unknown,
  ): HatchetExecutionError {
    return new HatchetExecutionError({ message, taskName, cause })
  }
}

/**
 * Error when worker registration fails
 */
export class HatchetWorkerError extends Data.TaggedError("HatchetWorkerError")<{
  readonly message: string
  readonly workerName?: string
  readonly cause?: unknown
}> {
  static of(
    message: string,
    workerName?: string,
    cause?: unknown,
  ): HatchetWorkerError {
    return new HatchetWorkerError({ message, workerName, cause })
  }
}

/**
 * Error when context operations fail
 */
export class HatchetContextError extends Data.TaggedError(
  "HatchetContextError",
)<{
  readonly message: string
  readonly operation: "input" | "parentOutput" | "log"
  readonly cause?: unknown
}> {
  static of(
    operation: "input" | "parentOutput" | "log",
    message: string,
    cause?: unknown,
  ): HatchetContextError {
    return new HatchetContextError({ message, operation, cause })
  }
}

/**
 * Error when a workflow run fails
 */
export class HatchetRunError extends Data.TaggedError("HatchetRunError")<{
  readonly message: string
  readonly workflow?: string
  readonly runId?: string
  readonly cause?: unknown
}> {
  static of(
    message: string,
    workflow?: string,
    runId?: string,
    cause?: unknown,
  ): HatchetRunError {
    return new HatchetRunError({ message, workflow, runId, cause })
  }
}

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
}> {
  static of(input: {
    readonly message: string
    readonly operation: "logs" | "metrics"
    readonly endpoint: string
    readonly taskId?: string
    readonly tenantId?: string
    readonly cause?: unknown
  }): HatchetObservabilityError {
    return new HatchetObservabilityError(input)
  }
}

/**
 * Error when a workflow operation fails (create, get, list)
 */
export class HatchetWorkflowError extends Data.TaggedError(
  "HatchetWorkflowError",
)<{
  readonly message: string
  readonly workflowName?: string
  readonly cause?: unknown
}> {
  static of(
    message: string,
    workflowName?: string,
    cause?: unknown,
  ): HatchetWorkflowError {
    return new HatchetWorkflowError({ message, workflowName, cause })
  }
}

/**
 * Error when an event operation fails
 */
export class HatchetEventError extends Data.TaggedError("HatchetEventError")<{
  readonly message: string
  readonly key?: string
  readonly eventId?: string
  readonly cause?: unknown
}> {
  static of(
    message: string,
    key?: string,
    eventId?: string,
    cause?: unknown,
  ): HatchetEventError {
    return new HatchetEventError({ message, key, eventId, cause })
  }
}

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
}> {
  static of(
    message: string,
    scheduleId?: string,
    workflowName?: string,
    cause?: unknown,
  ): HatchetScheduleError {
    return new HatchetScheduleError({
      message,
      scheduleId,
      workflowName,
      cause,
    })
  }
}

/**
 * Error when a cron operation fails
 */
export class HatchetCronError extends Data.TaggedError("HatchetCronError")<{
  readonly message: string
  readonly cronId?: string
  readonly workflowName?: string
  readonly cause?: unknown
}> {
  static of(
    message: string,
    cronId?: string,
    workflowName?: string,
    cause?: unknown,
  ): HatchetCronError {
    return new HatchetCronError({
      message,
      cronId,
      workflowName,
      cause,
    })
  }
}
