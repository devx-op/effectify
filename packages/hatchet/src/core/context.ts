/**
 * @effectify/hatchet - Hatchet Step Context
 *
 * Context.Service for injecting Hatchet context into Effect tasks
 */

import * as Context from "effect/Context"
import type { Context as SdkContext } from "@hatchet-dev/typescript-sdk"

export type HatchetTaskContext<
  I = unknown,
  U extends Record<string, unknown> = Record<string, never>,
> = SdkContext<I, U>

/**
 * Context.Service for the Hatchet step context
 * This is injected at runtime by the effectifier when executing a task
 */
export class HatchetStepContext extends Context.Service<
  HatchetStepContext,
  HatchetTaskContext
>()("HatchetStepContext") {}
