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
