/**
 * @effectify/hatchet - Testing Utilities
 *
 * Utilities for testing workflows without external dependencies.
 */

import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import type { Context as HatchetContext } from "@hatchet-dev/typescript-sdk"
import { HatchetStepContext } from "../core/context.js"

/**
 * Creates a mock HatchetStepContext for testing.
 *
 * @param options - Optional configuration for the mock context
 * @returns A mock context object
 */
export const createMockContext = (
  options: {
    readonly input?: unknown
    readonly taskName?: string
    readonly workflowName?: string
    readonly workflowRunId?: string
    readonly retryCount?: number
  } = {},
): HatchetContext<any, any> => {
  const {
    input = {},
    taskName = "test-task",
    workflowName = "test-workflow",
    workflowRunId = "test-run-id",
    retryCount = 0,
  } = options

  // Return as any - the actual Hatchet SDK context has many internal properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    input,
    taskName: () => taskName,
    workflowName: () => workflowName,
    workflowRunId: () => workflowRunId,
    retryCount: () => retryCount,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parentOutput: async () => null as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log: async (_msg: any) => {
      // no-op for testing
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: {} as any,
  } as any
}

/**
 * Creates a Layer that provides a mock HatchetStepContext.
 *
 * @param mockContext - The mock context to provide
 * @returns A Layer that provides the mock context
 */
export const createMockLayer = (
  mockContext: HatchetContext<any, any>,
): Layer.Layer<HatchetStepContext, never, never> =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Layer.succeed(HatchetStepContext, mockContext as any)

/**
 * Creates a Layer with a default mock context.
 *
 * @returns A Layer with default mock context
 */
export const createDefaultMockLayer = (): Layer.Layer<
  HatchetStepContext,
  never,
  never
> =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Layer.succeed(HatchetStepContext, createMockContext() as any)

/**
 * Runs an Effect with a mock HatchetStepContext using provide.
 *
 * @param effect - The Effect to run
 * @param mockContext - Optional mock context (creates default if not provided)
 * @returns Effect with the context provided
 */
export const runWithMockContext = <A, E>(
  effect: Effect.Effect<A, E, HatchetStepContext>,
  mockContext?: HatchetContext<any, any>,
): Effect.Effect<A, E, never> => {
  const ctx = mockContext ?? createMockContext()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockLayer = Layer.succeed(HatchetStepContext, ctx as any)
  return Effect.provide(effect, mockLayer)
}

/**
 * A simple test runner that executes an Effect with mock context.
 *
 * @param effect - The Effect to test
 * @param mockContext - Optional mock context
 * @returns Promise with the result
 */
export const testTask = async <A, E>(
  effect: Effect.Effect<A, E, HatchetStepContext>,
  mockContext?: HatchetContext<any, any>,
): Promise<A> => {
  const ctx = mockContext ?? createMockContext()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockLayer = Layer.succeed(HatchetStepContext, ctx as any)
  const effectWithContext = Effect.provide(effect, mockLayer)
  return Effect.runPromise(effectWithContext)
}

/**
 * A test runner that returns the Exit for more detailed assertions.
 *
 * @param effect - The Effect to test
 * @param mockContext - Optional mock context
 * @returns Promise with the Exit
 */
export const testTaskExit = async <A, E>(
  effect: Effect.Effect<A, E, HatchetStepContext>,
  mockContext?: HatchetContext<any, any>,
): Promise<Exit.Exit<A, E>> => {
  const ctx = mockContext ?? createMockContext()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockLayer = Layer.succeed(HatchetStepContext, ctx as any)
  const effectWithContext = Effect.provide(effect, mockLayer)
  return Effect.runPromiseExit(effectWithContext)
}

/**
 * @deprecated Use createMockContext instead
 */
export const createMockStepContext = createMockContext
