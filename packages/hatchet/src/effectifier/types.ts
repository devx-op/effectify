/**
 * @effectify/hatchet - Effectifier Module
 *
 * Types for the effectifier that converts Effect → Promise for Hatchet
 */

import type { Effect, ManagedRuntime } from "effect"
import type { HatchetStepContext, HatchetTaskContext } from "../core/context.js"

/**
 * Signature of a function that Hatchet calls to execute a task
 * SDK v1: (input: unknown, ctx: HatchetContext) => Promise<output>
 */
export type HatchetTaskFn = (
  input: unknown,
  ctx: HatchetTaskContext,
) => Promise<unknown>

/**
 * Options for effectifyTask
 */
export interface EffectifyOptions {
  /**
   * Whether to sync logs to Hatchet UI
   * @default true
   */
  syncLogs?: boolean
}

/**
 * Internal type for the effectified task with its runtime
 */
export interface EffectifiedTask<R, ER> {
  readonly taskFn: HatchetTaskFn
  readonly runtime: ManagedRuntime.ManagedRuntime<R, ER>
}

/**
 * Type for a Effect that can be converted to a Hatchet task
 * Must require HatchetStepContext in its dependencies
 */
export type HatchetEffect<A, E, R> = Effect.Effect<
  A,
  E,
  R | HatchetStepContext
>
