/**
 * @effectify/hatchet - Runs Client
 *
 * Client for interacting with workflow and task runs in Hatchet
 */

import * as Effect from "effect/Effect"
import type {
  APIContracts,
  ListRunsOpts as SdkListRunsOpts,
  ReplayRunOpts as SdkReplayRunOpts,
  RunFilter as SdkRunFilter,
  RunOpts as SdkRunOpts,
} from "@hatchet-dev/typescript-sdk"
import type { HatchetClientService } from "../core/client.js"
import { getHatchetClient } from "../core/client.js"
import { HatchetRunError, HatchetWorkflowError } from "../core/error.js"

/**
 * Type audit:
 * - `RunOpts` is a direct SDK passthrough because `run` / `runNoWait` forward it unchanged.
 * - `RunFilter` keeps singular `workflowName` / `status` convenience while reusing SDK array/date fields.
 * - `ListRunsOpts` derives from SDK list options, hiding only the internal `onlyTasks` flag.
 * - `ReplayRunOpts` keeps the convenience filter boundary and readonly ids, then normalizes to SDK transport.
 * - Tagged errors stay local for the Effect boundary.
 */
export type RunOpts = SdkRunOpts

export type RunStatus = NonNullable<SdkRunFilter["statuses"]>[number]

export type RunFilter = SdkRunFilter & {
  readonly workflowName?: string
  readonly status?: RunStatus
}

export type ReplayRunOpts = Omit<SdkReplayRunOpts, "ids" | "filters"> & {
  readonly ids?: readonly string[]
  readonly filters?: RunFilter
}

export type ListRunsOpts =
  & Omit<
    Partial<SdkListRunsOpts>,
    "workflowNames" | "statuses" | "onlyTasks"
  >
  & RunFilter

const toSdkRunFilter = (options?: RunFilter): SdkRunFilter => ({
  workflowNames: options?.workflowNames?.length
    ? [...options.workflowNames]
    : options?.workflowName
    ? [options.workflowName]
    : undefined,
  statuses: options?.statuses?.length
    ? [...options.statuses]
    : options?.status
    ? [options.status as NonNullable<SdkRunFilter["statuses"]>[number]]
    : undefined,
  since: options?.since,
  until: options?.until,
  additionalMetadata: options?.additionalMetadata,
})

const toSdkListRunsOpts = (
  options?: ListRunsOpts,
): Partial<SdkListRunsOpts> => {
  const {
    workflowName,
    workflowNames,
    status,
    statuses,
    since,
    until,
    additionalMetadata,
    ...rest
  } = options ?? {}

  return {
    ...rest,
    ...toSdkRunFilter({
      workflowName,
      workflowNames,
      status,
      statuses,
      since,
      until,
      additionalMetadata,
    }),
    onlyTasks: false,
  }
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
      try: () => client.run(workflow, input as never, options),
      catch: (error) =>
        new HatchetRunError({
          message: `Workflow "${workflow}" failed to run`,
          workflow,
          cause: error,
        }),
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
      try: () => client.runNoWait(workflow, input as never, options ?? {}),
      catch: (error) =>
        new HatchetRunError({
          message: `Workflow "${workflow}" failed to start`,
          workflow,
          cause: error,
        }),
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
      try: () => client.runs.cancel({ ids: [runId] }),
      catch: (error) =>
        new HatchetRunError({
          message: `Failed to cancel run "${runId}"`,
          runId,
          cause: error,
        }),
    })
  })

export const replayRun = <O = APIContracts.V1ReplayedTasks>(
  run: string | ReplayRunOpts,
): Effect.Effect<O, HatchetRunError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const replayOptions: SdkReplayRunOpts = typeof run === "string"
      ? { ids: [run] }
      : {
        ids: run.ids?.length ? [...run.ids] : undefined,
        filters: run.filters ? toSdkRunFilter(run.filters) : undefined,
      }
    const result = yield* Effect.tryPromise({
      try: () => client.runs.replay(replayOptions),
      catch: (error) =>
        new HatchetRunError({
          message: typeof run === "string"
            ? `Failed to replay run "${run}"`
            : "Failed to replay runs",
          runId: typeof run === "string" ? run : undefined,
          cause: error,
        }),
    })

    return result.data as O
  })

export const restoreTask = <O = APIContracts.V1RestoreTaskResponse>(
  taskExternalId: string,
): Effect.Effect<O, HatchetRunError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const result = yield* Effect.tryPromise({
      try: () => client.runs.restoreTask(taskExternalId),
      catch: (error) =>
        new HatchetRunError({
          message: `Failed to restore task "${taskExternalId}"`,
          runId: taskExternalId,
          cause: error,
        }),
    })

    return result.data as O
  })

export const branchDurableTask = <O = APIContracts.V1BranchDurableTaskResponse>(
  taskExternalId: string,
  nodeId: number,
  branchId?: number,
): Effect.Effect<O, HatchetRunError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const result = yield* Effect.tryPromise({
      try: () => client.runs.branchDurableTask(taskExternalId, nodeId, branchId),
      catch: (error) =>
        new HatchetRunError({
          message: `Failed to branch durable task "${taskExternalId}" from node ${nodeId}`,
          runId: taskExternalId,
          cause: error,
        }),
    })

    return result.data as O
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
      try: () => client.runs.get(runId),
      catch: (error) =>
        new HatchetRunError({
          message: `Failed to get run "${runId}"`,
          runId,
          cause: error,
        }),
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
      try: () => client.runs.get_status(runId),
      catch: (error) =>
        new HatchetRunError({
          message: `Failed to get status for run "${runId}"`,
          runId,
          cause: error,
        }),
    })
    return result as string
  })

/**
 * Resolve the task external id for a workflow run.
 */
export const getRunTaskId = (
  runId: string,
): Effect.Effect<string, HatchetRunError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const result = yield* Effect.tryPromise({
      try: () => client.runs.getTaskExternalId(runId),
      catch: (error) =>
        new HatchetRunError({
          message: `Failed to resolve task id for run "${runId}"`,
          runId,
          cause: error,
        }),
    })

    return result as string
  })

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
      try: () => client.runs.list(toSdkListRunsOpts(options)),
      catch: (error) =>
        new HatchetWorkflowError({
          message: "Failed to list runs",
          cause: error,
        }),
    })
    const runs = result as unknown as { readonly rows?: O[] }
    return runs.rows ?? []
  })
