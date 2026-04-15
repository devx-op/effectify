/**
 * @effectify/hatchet - Testing Utilities
 *
 * Utilities for testing workflows without external dependencies.
 */

import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import { HatchetStepContext, type HatchetTaskContext } from "../core/context.js"

type MockHatchetTaskContext<I, U extends Record<string, unknown>> = Pick<
  HatchetTaskContext<I, U>,
  | "input"
  | "taskName"
  | "workflowName"
  | "workflowRunId"
  | "retryCount"
  | "parentOutput"
  | "log"
  | "logger"
>

const toHatchetTaskContext = <I, U extends Record<string, unknown>>(
  context: MockHatchetTaskContext<I, U>,
): HatchetTaskContext<I, U> => context as unknown as HatchetTaskContext<I, U>

const createProvidedMockLayer = (
  mockContext: HatchetTaskContext,
): Layer.Layer<HatchetStepContext, never, never> => Layer.succeed(HatchetStepContext, mockContext)

/**
 * Creates a mock HatchetStepContext for testing.
 *
 * @param options - Optional configuration for the mock context
 * @returns A mock context object
 */
export const createMockContext = <
  I = unknown,
  U extends Record<string, unknown> = Record<string, never>,
>(
  options: {
    readonly input?: I
    readonly taskName?: string
    readonly workflowName?: string
    readonly workflowRunId?: string
    readonly retryCount?: number
  } = {},
): HatchetTaskContext<I, U> => {
  const {
    input,
    taskName = "test-task",
    workflowName = "test-workflow",
    workflowRunId = "test-run-id",
    retryCount = 0,
  } = options

  const providedInput = (input ?? {}) as I

  const mockContext: MockHatchetTaskContext<I, U> = {
    input: providedInput,
    taskName: () => taskName,
    workflowName: () => workflowName,
    workflowRunId: () => workflowRunId,
    retryCount: () => retryCount,
    parentOutput: async () => null as never,
    log: async (_message) => {
      // no-op for testing
    },
    logger: {
      info: async () => {},
      debug: async () => {},
      warn: async () => {},
      error: async () => {},
      util: () => {},
    },
  }

  return toHatchetTaskContext(mockContext)
}

/**
 * Creates a Layer that provides a mock HatchetStepContext.
 *
 * @param mockContext - The mock context to provide
 * @returns A Layer that provides the mock context
 */
export const createMockLayer = (
  mockContext: HatchetTaskContext,
): Layer.Layer<HatchetStepContext, never, never> => createProvidedMockLayer(mockContext)

/**
 * Creates a Layer with a default mock context.
 *
 * @returns A Layer with default mock context
 */
export const createDefaultMockLayer = (): Layer.Layer<
  HatchetStepContext,
  never,
  never
> => createProvidedMockLayer(createMockContext())

/**
 * Runs an Effect with a mock HatchetStepContext using provide.
 *
 * @param effect - The Effect to run
 * @param mockContext - Optional mock context (creates default if not provided)
 * @returns Effect with the context provided
 */
export const runWithMockContext = <A, E>(
  effect: Effect.Effect<A, E, HatchetStepContext>,
  mockContext?: HatchetTaskContext,
): Effect.Effect<A, E, never> => {
  const ctx = mockContext ?? createMockContext()
  const mockLayer = createProvidedMockLayer(ctx)
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
  mockContext?: HatchetTaskContext,
): Promise<A> => {
  const ctx = mockContext ?? createMockContext()
  const mockLayer = createProvidedMockLayer(ctx)
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
  mockContext?: HatchetTaskContext,
): Promise<Exit.Exit<A, E>> => {
  const ctx = mockContext ?? createMockContext()
  const mockLayer = createProvidedMockLayer(ctx)
  const effectWithContext = Effect.provide(effect, mockLayer)
  return Effect.runPromiseExit(effectWithContext)
}

/**
 * @deprecated Use createMockContext instead
 */
export const createMockStepContext = createMockContext
