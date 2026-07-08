/**
 * @effectify/hatchet - Workflow Builder
 *
 * Declarative workflow builder for defining Hatchet workflows with Effect.
 * Mirrors Hatchet API but uses Effect instead of async functions.
 */

import * as Effect from "effect/Effect"
import type { TaskOptions, WorkflowOptions } from "./types.js"
import type { HatchetStepContext } from "../core/context.js"
import type { TaskDefinition } from "./task.js"

/**
 * EffectWorkflow - Builder class for defining Hatchet workflows with Effect
 *
 * Provides a fluent API for defining workflows with tasks that return Effect.
 * Tracks accumulated dependencies through the type system.
 *
 * @example
 * ```typescript
 * // Style 1: Pass task definition
 * const myWorkflow = workflow({ name: "my-workflow" })
 *   .task(task({ name: "task1" }, myEffect1))
 *   .task(task({ name: "task2", parents: ["task1"] }, myEffect2));
 *
 * // Style 2: Pass options + effect directly
 * const myWorkflow = workflow({ name: "my-workflow" })
 *   .task({ name: "task1" }, myEffect1)
 *   .task({ name: "task2", parents: ["task1"] }, myEffect2);
 * ```
 */
export class EffectWorkflow<R> {
  readonly tasks: TaskDefinition<R>[] = []

  constructor(
    readonly options: WorkflowOptions,
    readonly dependencies: R = undefined as unknown as R,
  ) {}

  /**
   * Adds a task to the workflow.
   *
   * Supports two styles:
   * 1. .task(taskDefinition) - from task() function
   * 2. .task(taskOptions, effect) - direct options + effect
   */
  task<A, E, R2>(
    optionsOrDefinition: TaskOptions | TaskDefinition<R2>,
    effect?: Effect.Effect<A, E, R2 | HatchetStepContext>,
  ): EffectWorkflow<R | R2> {
    let taskDef: TaskDefinition<R | R2>

    if (effect === undefined) {
      // Style 1: Passed a task definition from task()
      const def = optionsOrDefinition as TaskDefinition<R2>
      taskDef = def as TaskDefinition<R | R2>
    } else {
      // Style 2: Passed options + effect directly
      const opts = optionsOrDefinition as TaskOptions
      // Create task definition preserving original effect types
      taskDef = {
        options: opts,
        effect,
      } as TaskDefinition<R | R2>
    }

    const newWorkflow = new EffectWorkflow<R | R2>(
      this.options,
      undefined as unknown as R | R2,
    )

    // Copy existing tasks
    newWorkflow.tasks.push(...this.tasks)

    // Add the new task
    newWorkflow.tasks.push(taskDef)

    return newWorkflow
  }

  /**
   * Returns the accumulated dependencies from all tasks.
   */
  getDependencies(): R {
    return this.dependencies
  }
}

/**
 * Creates a new EffectWorkflow builder.
 *
 * Mirrors Hatchet's workflow() function but returns EffectWorkflow.
 *
 * @param options - Workflow configuration
 * @returns A new EffectWorkflow instance
 *
 * @example
 * ```typescript
 * const myWorkflow = workflow({
 *   name: "my-workflow",
 *   description: "My first Effect-powered workflow",
 * });
 * ```
 */
export const workflow = (options: WorkflowOptions): EffectWorkflow<never> => new EffectWorkflow(options)
