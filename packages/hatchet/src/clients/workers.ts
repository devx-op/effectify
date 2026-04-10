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
  Effect.tryPromise({
    try: async () => {
      const client = await getHatchetClient()
      const workersClient = (client as any).workers
      const worker = workersClient.register(name, workflows, opts)
      return worker as O
    },
    catch: (error) => HatchetWorkerError.of(`Failed to register worker "${name}"`, name, error),
  })
