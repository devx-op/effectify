/**
 * @effectify/hatchet - Task Helper
 *
 * Helper functions for creating tasks.
 * Mirrors Hatchet API but uses Effect instead of async functions.
 */

import * as Effect from "effect/Effect"
import type { TaskOptions } from "./types.js"
import type { HatchetStepContext } from "../core/context.js"

/**
 * Creates a task that can be added to a workflow.
 *
 * This is the main way to define tasks in @effectify/hatchet,
 * mirroring Hatchet's API but using Effect instead of async functions.
 *
 * @param options - Task configuration (name, timeout, retries, parents, etc.)
 * @param effect - The Effect to execute for this task
 * @returns A TaskDefinition that can be added to a workflow
 *
 * @example
 * ```typescript
 * // Define a task
 * const fetchUserTask = task(
 *   { name: "fetch-user", timeout: "30s" },
 *   Effect.gen(function*() {
 *     const input = yield* getValidatedInput(UserSchema)
 *     const user = yield* Database.findUser(input.userId)
 *     return user
 *   })
 * )
 *
 * // Add to workflow
 * const myWorkflow = workflow({ name: "my-workflow" })
 *   .task(fetchUserTask)
 * ```
 */
export const task = <A, E, R>(
  options: TaskOptions,
  effect: Effect.Effect<A, E, R | HatchetStepContext>,
): {
  options: TaskOptions
  effect: Effect.Effect<A, E, R | HatchetStepContext>
} => ({
  options,
  effect,
})

/**
 * Type for a task definition that can be added to a workflow.
 * Preserves the original Effect types A (value), E (error), and R (requirements).
 */
export type TaskDefinition<R> = {
  readonly options: TaskOptions
  // Use a type that preserves the effect's type parameters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly effect: Effect.Effect<any, any, R | HatchetStepContext>
}

/**
 * Type for mapping task names to their results.
 */
export type TaskResults<T extends TaskOptions> = {
  [K in T["name"]]: unknown
}
