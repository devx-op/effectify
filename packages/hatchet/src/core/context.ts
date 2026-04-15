/**
 * @effectify/hatchet - Hatchet Step Context
 *
 * ServiceMap.Service for injecting Hatchet context into Effect tasks
 */

import * as ServiceMap from "effect/ServiceMap"
import type { Context as SdkContext } from "@hatchet-dev/typescript-sdk"

export type HatchetTaskContext<
  I = unknown,
  U extends Record<string, unknown> = Record<string, never>,
> = SdkContext<I, U>

/**
 * ServiceMap.Service for the Hatchet step context
 * This is injected at runtime by the effectifier when executing a task
 */
export class HatchetStepContext extends ServiceMap.Service<
  HatchetStepContext,
  HatchetTaskContext
>()("HatchetStepContext") {}
