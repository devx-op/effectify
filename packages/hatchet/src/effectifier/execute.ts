/**
 * @effectify/hatchet - Effectifier Execute
 *
 * Core function that converts Effect<A, E, R> to a Hatchet-compatible Promise function
 * Uses ManagedRuntime to execute Effects with their dependencies
 */

import * as Effect from "effect/Effect"
import * as Cause from "effect/Cause"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as Layer from "effect/Layer"
import type { Context as HatchetContext } from "@hatchet-dev/typescript-sdk"
import type { HatchetTaskFn } from "./types.js"
import { HatchetStepContext } from "../core/context.js"

/**
 * effectifyTask converts an Effect into a Hatchet-compatible task function.
 *
 * This is the core "Effectifier" - it bridges Effect's pure functional world
 * with Hatchet's Promise-based task execution.
 *
 * @param effect - The Effect to execute
 * @param runtime - ManagedRuntime with the Effect's dependencies
 * @returns A function compatible with Hatchet's task signature
 *
 * Usage:
 * ```typescript
 * const taskFn = effectifyTask(myEffect, runtime);
 * workflow.task({ name: "my-task", fn: taskFn });
 * ```
 */
export const effectifyTask = <A, E, R, ER>(
  effect: Effect.Effect<A, E, R | HatchetStepContext>,
  runtime: ManagedRuntime.ManagedRuntime<R, ER>,
): HatchetTaskFn => {
  return async (input: unknown, ctx: HatchetContext<any, any>): Promise<A> => {
    // 1. Inject the Hatchet context as a service
    const effectWithContext = Effect.provideService(
      effect,
      HatchetStepContext,
      ctx,
    )

    // 2. Execute with the ManagedRuntime
    const exit = await runtime.runPromiseExit(effectWithContext)

    // 3. Convert result
    if (exit._tag === "Success") {
      return exit.value
    } else {
      // Convert Failure to thrown error so Hatchet can apply retries
      const error = Cause.squash(exit.cause)
      throw error instanceof Error ? error : new Error(String(error))
    }
  }
}

/**
 * createEffectifierFromLayer creates an effectifier from a Layer.
 *
 * This is a convenience factory for common use cases where you have
 * a Layer describing all your dependencies.
 *
 * @param layer - The Layer containing all dependencies
 * @returns An effectifyTask function bound to that runtime
 *
 * Usage:
 * ```typescript
 * const effectify = createEffectifierFromLayer(MyAppLayer);
 * const taskFn = effectify(myEffect);
 * ```
 */
export const createEffectifierFromLayer = <R, ER>(
  layer: Layer.Layer<R, ER, never>,
) => {
  const runtime = ManagedRuntime.make(layer)

  return <A, E>(
    effect: Effect.Effect<A, E, R | HatchetStepContext>,
  ): HatchetTaskFn => effectifyTask(effect, runtime)
}

/**
 * createEffectifierFromServices creates an effectifier from a ServiceMap.
 *
 * @param services - The ServiceMap with dependencies
 * @returns An effectifyTask function bound to that runtime
 */
export const createEffectifierFromServiceMap = <R>(
  services: Layer.Layer<R, never, never>,
) => {
  return createEffectifierFromLayer(services)
}
