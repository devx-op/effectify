/**
 * @effectify/hatchet - Workers Client
 *
 * Client for managing workers in Hatchet
 */

import * as Effect from "effect/Effect"
import type { HatchetClient, Worker as SdkWorker } from "@hatchet-dev/typescript-sdk"
import type { HatchetClientService } from "../core/client.js"
import { getHastchetClient } from "../core/client.js"
import { HatchetWorkerError } from "../core/error.js"

/**
 * Type audit:
 * - `registerWorker` is a direct passthrough to `client.worker`, so it adopts the SDK worker options.
 * - The wrapper still owns the Effect error boundary and workflow registration lifecycle.
 */
export type RegisterWorkerOpts = Exclude<
  Parameters<HatchetClient["worker"]>[1],
  number
>

export type WorkerRegistrationWorkflow = NonNullable<
  Parameters<SdkWorker["registerWorkflows"]>[0]
>[number]

export type WorkerRegistrationWorkflows = NonNullable<
  Parameters<SdkWorker["registerWorkflows"]>[0]
>

const toWorkerOptions = (
  opts?: RegisterWorkerOpts,
): RegisterWorkerOpts | undefined => opts

type RegisterableWorker = {
  readonly registerWorkflows: (workflows?: unknown[]) => Promise<void>
  readonly start: () => Promise<void>
}

const toWorkerOptions = (opts?: RegisterWorkerOpts) => ({
  slots: opts?.maxConcurrent,
})

/**
 * Register a worker with Hatchet
 *
 * @param name - The name of the worker
 * @param workflows - The workflows to register with this worker
 * @param opts - Optional worker options
 * @returns Effect that resolves with the registered worker
 */
export const registerWorker = (
  name: string,
  workflows: WorkerRegistrationWorkflows,
  opts?: RegisterWorkerOpts,
): Effect.Effect<SdkWorker, HatchetWorkerError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const worker = yield* Effect.tryPromise({
      try: () => client.worker(name, toWorkerOptions(opts)),
      catch: (error) =>
        new HatchetWorkerError({
          message: `Failed to register worker "${name}"`,
          workerName: name,
          cause: error,
        }),
    })

    yield* Effect.tryPromise({
      try: () => worker.registerWorkflows(workflows),
      catch: (error) =>
        new HatchetWorkerError({
          message: `Failed to register worker "${name}"`,
          workerName: name,
          cause: error,
        }),
    })

    yield* Effect.tryPromise({
      try: () => worker.start(),
      catch: (error) =>
        new HatchetWorkerError({
          message: `Failed to register worker "${name}"`,
          workerName: name,
          cause: error,
        }),
    })

    return worker
  })
