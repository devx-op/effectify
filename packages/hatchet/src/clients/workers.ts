/**
 * @effectify/hatchet - Workers Client
 *
 * Client for managing workers in Hatchet
 */

import * as Effect from "effect/Effect"
import type { HatchetClientService } from "../core/client.js"
import { getHatchetClient } from "../core/client.js"
import { HatchetWorkerError } from "../core/error.js"

export interface RegisterWorkerOpts {
  readonly maxConcurrent?: number
  readonly maxWorkflows?: number
  readonly timeout?: string
}

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
export const registerWorker = <O = unknown>(
  name: string,
  workflows: any[],
  opts?: RegisterWorkerOpts,
): Effect.Effect<O, HatchetWorkerError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const worker = (yield* Effect.tryPromise({
      try: () => client.worker(name, toWorkerOptions(opts)),
      catch: (error) =>
        new HatchetWorkerError({
          message: `Failed to register worker "${name}"`,
          workerName: name,
          cause: error,
        }),
    })) as RegisterableWorker

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

    return worker as O
  })
