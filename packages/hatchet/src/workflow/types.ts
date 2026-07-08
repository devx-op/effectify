/**
 * @effectify/hatchet - Workflow Types
 *
 * Type definitions for the declarative workflow builder.
 */

import type { Effect } from "effect"
import type { Concurrency } from "@hatchet-dev/typescript-sdk"
import type { HatchetStepContext } from "../core/context.js"

/**
 * Options for defining a task in a workflow.
 */
export interface TaskOptions {
  /**
   * Unique name for this task within the workflow.
   */
  readonly name: string

  /**
   * Timeout for task execution (e.g., "30s", "5m").
   * SDK field: executionTimeout
   */
  readonly timeout?: string

  /**
   * Number of retry attempts on failure.
   */
  readonly retries?: number

  /**
   * Backoff strategy for retries.
   */
  readonly backoff?: {
    readonly factor?: number
    readonly maxSeconds?: number
  }

  /**
   * Rate limits for this task.
   */
  readonly rateLimits?: ReadonlyArray<{
    readonly units: string | number
    readonly key?: string
    readonly staticKey?: string
    readonly dynamicKey?: string
    readonly limit?: string | number
    readonly duration?: string
  }>

  /**
   * Concurrency settings.
   */
  readonly concurrency?: Concurrency | readonly Concurrency[]

  /**
   * Parent task names for DAG dependencies.
   * This task will wait for all parents to complete before running.
   */
  readonly parents?: readonly string[]
}

/**
 * Options for defining a workflow.
 */
export interface WorkflowOptions {
  /**
   * Unique name for this workflow.
   */
  readonly name: string

  /**
   * Human-readable description.
   */
  readonly description?: string

  /**
   * Version string (e.g., "1.0.0").
   */
  readonly version?: string

  /**
   * Whether to use sticky execution (same worker).
   */
  readonly sticky?: boolean

  /**
   * Concurrency settings for the workflow.
   */
  readonly concurrency?: Concurrency | readonly Concurrency[]
}

/**
 * Internal type for a task definition in the builder.
 */
export interface TaskDefinition<R> {
  readonly options: TaskOptions
  readonly effect: Effect.Effect<unknown, unknown, R | HatchetStepContext>
}

/**
 * Result from calling workflow.task() - can be chained.
 */
export interface TaskResult {
  readonly name: string
}
