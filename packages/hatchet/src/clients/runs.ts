/**
 * @effectify/hatchet - Runs Client
 *
 * Client for interacting with workflow and task runs in Hatchet
 */

import * as Effect from "effect/Effect"
import type { HatchetClientService } from "../core/client.js"
import { getHatchetClient } from "../core/client.js"
import { HatchetRunError, HatchetWorkflowError } from "../core/error.js"

export interface RunOpts {
  readonly additionalMetadata?: Record<string, unknown>
  readonly priority?: number
}

/**
 * Run a workflow and wait for completion
 *
 * @param workflow - The workflow name to run
 * @param input - The input data for the workflow
 * @param options - Optional run options
 * @returns Effect that resolves with the workflow result
 */
export const runWorkflow = <I, O>(
  workflow: string,
  input: I,
  options?: RunOpts,
): Effect.Effect<O, HatchetRunError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const result = yield* Effect.tryPromise({
      try: () => (client as any).run(workflow, input, options),
      catch: (error) =>
        HatchetRunError.of(
          `Workflow "${workflow}" failed to run`,
          workflow,
          undefined,
          error,
        ),
    })
    return result as O
  })

/**
 * Run a workflow without waiting for completion
 *
 * @param workflow - The workflow name to run
 * @param input - The input data for the workflow
 * @param options - Optional run options
 * @returns Effect that resolves with the workflow run details
 */
export const runWorkflowNoWait = <I, O>(
  workflow: string,
  input: I,
  options?: RunOpts,
): Effect.Effect<O, HatchetRunError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const result = yield* Effect.tryPromise({
      try: () => (client as any).runs.create(workflow, input, options),
      catch: (error) =>
        HatchetRunError.of(
          `Workflow "${workflow}" failed to start`,
          workflow,
          undefined,
          error,
        ),
    })
    return result as O
  })

/**
 * Cancel a running workflow or task
 *
 * @param runId - The ID of the run to cancel
 * @returns Effect that resolves when the run is cancelled
 */
export const cancelRun = (
  runId: string,
): Effect.Effect<void, HatchetRunError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    yield* Effect.tryPromise({
      try: () => (client as any).runs.cancel(runId),
      catch: (error) =>
        HatchetRunError.of(
          `Failed to cancel run "${runId}"`,
          undefined,
          runId,
          error,
        ),
    })
  })

/**
 * Get a workflow or task run by ID
 *
 * @param runId - The ID of the run to get
 * @returns Effect that resolves with the run details
 */
export const getRun = <O = unknown>(
  runId: string,
): Effect.Effect<O, HatchetRunError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const result = yield* Effect.tryPromise({
      try: () => (client as any).runs.get(runId),
      catch: (error) =>
        HatchetRunError.of(
          `Failed to get run "${runId}"`,
          undefined,
          runId,
          error,
        ),
    })
    return result as O
  })

/**
 * Get the status of a workflow or task run
 *
 * @param runId - The ID of the run to check
 * @returns Effect that resolves with the run status
 */
export const getRunStatus = (
  runId: string,
): Effect.Effect<string, HatchetRunError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const result = yield* Effect.tryPromise({
      try: () => (client as any).runs.get(runId),
      catch: (error) =>
        HatchetRunError.of(
          `Failed to get status for run "${runId}"`,
          undefined,
          runId,
          error,
        ),
    })
    return (result as any).status as string
  })

export interface ListRunsOpts {
  readonly workflowName?: string
  readonly status?: string
  readonly limit?: number
  readonly offset?: number
}

/**
 * List workflow and task runs
 *
 * @param options - Options for filtering and paginating runs
 * @returns Effect that resolves with the list of runs
 */
export const listRuns = <O = unknown>(
  options?: ListRunsOpts,
): Effect.Effect<O[], HatchetWorkflowError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const result = yield* Effect.tryPromise({
      try: () => (client as any).runs.list(options),
      catch: (error) => HatchetWorkflowError.of("Failed to list runs", undefined, error),
    })
    return ((result as any).rows || (result as any).runs || []) as O[]
  })
