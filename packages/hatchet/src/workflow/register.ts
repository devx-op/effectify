/**
 * @effectify/hatchet - Workflow Registration
 *
 * Registers EffectWorkflows with Hatchet workers.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import type { Worker } from "@hatchet-dev/typescript-sdk"
import type { StickyStrategyInput } from "@hatchet-dev/typescript-sdk"
import type { Concurrency } from "@hatchet-dev/typescript-sdk"
import type { Duration } from "@hatchet-dev/typescript-sdk"
import type { RateLimitDuration } from "@hatchet-dev/typescript-sdk"
import type { WorkflowDeclaration } from "@hatchet-dev/typescript-sdk"
import type { HatchetClientService } from "../core/client.js"
import { getHatchetClient } from "../core/client.js"
import type { EffectWorkflow } from "./workflow.js"
import { effectifyTask } from "../effectifier/execute.js"
import { HatchetError } from "../core/error.js"

/**
 * Registers an EffectWorkflow with a Hatchet worker.
 *
 * This function:
 * 1. Gets the Hatchet client from the Effect context
 * 2. Creates a workflow using hatchet.workflow()
 * 3. Converts each Effect task to a Hatchet-compatible function
 * 4. Registers the tasks with the workflow
 * 5. Creates a worker and registers the workflow
 * 6. Starts the worker
 *
 * @param workerName - Name for the Hatchet worker
 * @param wf - The EffectWorkflow to register
 * @param layer - The Layer containing all Dependencies
 * @returns Effect that succeeds when worker starts (or fails with HatchetError)
 *
 * @example
 * ```typescript
 * const myWorkflow = workflow({ name: "my-workflow" })
 *   .task({ name: "task1" }, EffectGen.task1)
 *   .task({ name: "task2", parents: ["task1"] }, EffectGen.task2);
 *
 * const register = registerWorkflow("my-worker", myWorkflow, MyAppLayer);
 *
 * // Run it
 * await Effect.runPromise(register);
 * ```
 */
export const registerWorkflow = <R>(
  workerName: string,
  wf: EffectWorkflow<R>,
  layer: Layer.Layer<R, never, never>,
): Effect.Effect<void, HatchetError, HatchetClientService> =>
  Effect.gen(function*() {
    // 1. Get the Hatchet client
    const hatchet = yield* getHatchetClient()

    // 2. Create the ManagedRuntime
    const runtime = ManagedRuntime.make(layer)

    // 3. Convert sticky option to proper type
    const sticky: StickyStrategyInput | undefined = wf.options.sticky
      ? "soft"
      : undefined

    // 4. Create the workflow using Hatchet SDK
    const workflowDeclaration = hatchet.workflow({
      name: wf.options.name,
      description: wf.options.description,
      version: wf.options.version,
      sticky,
      concurrency: convertConcurrency(wf.options.concurrency),
    })

    // 5. Convert each Effect task to Hatchet task
    const taskMap = new Map<string, ReturnType<WorkflowDeclaration["task"]>>()

    for (const taskDef of wf.tasks) {
      // Create the effectified task function
      const taskFn = effectifyTask(taskDef.effect, runtime)

      // Get parent tasks if specified
      const parents = taskDef.options.parents
        ? taskDef.options.parents
          .map((parentName) => taskMap.get(parentName))
          .filter((p): p is NonNullable<typeof p> => p !== undefined)
        : undefined

      // Create the Hatchet task
      const hatchetTask = workflowDeclaration.task({
        name: taskDef.options.name,
        fn: taskFn,
        executionTimeout: taskDef.options.timeout as Duration | undefined,
        retries: taskDef.options.retries,
        backoff: taskDef.options.backoff,
        rateLimits: convertRateLimits(taskDef.options.rateLimits),
        concurrency: convertConcurrency(taskDef.options.concurrency),
        parents: parents,
      })

      taskMap.set(taskDef.options.name, hatchetTask)
    }

    // 6. Create the worker (returns a Promise)
    const worker: Worker = yield* Effect.tryPromise({
      try: async () =>
        await hatchet.worker(workerName, {
          labels: {},
        }),
      catch: (error) =>
        new HatchetError({
          message: `Failed to create worker: ${error}`,
          cause: error,
        }),
    })

    // 7. Register the workflow
    yield* Effect.tryPromise({
      try: () => worker.registerWorkflow(workflowDeclaration),
      catch: (error) =>
        new HatchetError({
          message: `Failed to register workflow: ${error}`,
          cause: error,
        }),
    })

    // 8. Start the worker (this is blocking)
    yield* Effect.tryPromise({
      try: () => worker.start(),
      catch: (error) =>
        new HatchetError({
          message: `Failed to start worker: ${error}`,
          cause: error,
        }),
    })
  })

/**
 * Converts concurrency options to the SDK format
 */
function convertConcurrency(
  concurrency: Concurrency | readonly Concurrency[] | undefined,
): Concurrency | Concurrency[] | undefined {
  if (concurrency === undefined) {
    return undefined
  }
  // Check if it's an array by checking for 'expression' property (single object) vs 'length' (array)
  if ("expression" in concurrency) {
    // Single Concurrency object
    return concurrency
  }
  // It's an array - make a mutable copy
  return [...concurrency] as Concurrency[]
}

/**
 * Converts rate limits to the SDK format
 */
function convertRateLimits(
  rateLimits:
    | ReadonlyArray<{
      readonly units: string | number
      readonly key?: string
      readonly staticKey?: string
      readonly dynamicKey?: string
      readonly limit?: string | number
      readonly duration?: string
    }>
    | undefined,
):
  | {
    units: string | number
    key?: string
    staticKey?: string
    dynamicKey?: string
    limit?: string | number
    duration?: RateLimitDuration
  }[]
  | undefined
{
  if (rateLimits === undefined) {
    return undefined
  }
  return rateLimits.map((rl) => ({
    units: rl.units,
    key: rl.key,
    staticKey: rl.staticKey,
    dynamicKey: rl.dynamicKey,
    limit: rl.limit,
    duration: rl.duration as RateLimitDuration | undefined,
  }))
}

/**
 * Creates a workflow registration effect with custom configuration.
 *
 * @param config - Configuration for the registration
 * @returns Effect that registers and starts the worker
 */
export interface RegisterWorkflowConfig<R> {
  workerName: string
  workflow: EffectWorkflow<R>
  layer: Layer.Layer<R, never, never>
  onStart?: () => void | Effect.Effect<void, never, never>
  onStop?: () => void | Effect.Effect<void, never, never>
}

export const registerWorkflowWithConfig = <R>(
  config: RegisterWorkflowConfig<R>,
): Effect.Effect<void, HatchetError, HatchetClientService> =>
  Effect.gen(function*() {
    // Run onStart callback if provided
    if (config.onStart) {
      const result = config.onStart()
      if (Effect.isEffect(result)) {
        yield* result
      }
    }

    // Register and start the workflow
    yield* registerWorkflow(config.workerName, config.workflow, config.layer)

    // Note: onStop would need to be handled by signal handlers
    // This is typically done at the application level
  })
