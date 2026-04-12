/**
 * @effectify/hatchet - Workflows Client
 *
 * Client for managing workflows in Hatchet
 */

import * as Effect from "effect/Effect"
import type { HatchetClientService } from "../core/client.js"
import { getHatchetClient } from "../core/client.js"
import { HatchetWorkflowError } from "../core/error.js"

export interface CreateWorkflowOpts {
  readonly name: string
  readonly version?: string
  readonly description?: string
}

/**
 * Create a new workflow in Hatchet
 *
 * @param workflow - The workflow object or name to create
 * @param opts - Optional workflow options
 * @returns Effect that resolves with the created workflow
 */
export const createWorkflow = <O = unknown>(
  _workflow: unknown,
  opts?: CreateWorkflowOpts,
): Effect.Effect<O, HatchetWorkflowError, HatchetClientService> =>
  Effect.fail(
    new HatchetWorkflowError({
      message: "Workflow creation is not supported by Hatchet SDK 1.21.0 public workflows client",
      workflowName: opts?.name,
    }),
  )

/**
 * Get a workflow by name
 *
 * @param name - The name of the workflow to get
 * @returns Effect that resolves with the workflow details
 */
export const getWorkflow = <O = unknown>(
  name: string,
): Effect.Effect<O, HatchetWorkflowError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const result = yield* Effect.tryPromise({
      try: () => client.workflows.get(name),
      catch: (error) =>
        new HatchetWorkflowError({
          message: `Failed to get workflow "${name}"`,
          workflowName: name,
          cause: error,
        }),
    })

    return result as O
  })

export interface ListWorkflowsOpts {
  readonly limit?: number
  readonly offset?: number
}

/**
 * List all workflows
 *
 * @param options - Options for filtering and paginating workflows
 * @returns Effect that resolves with the list of workflows
 */
export const listWorkflows = <O = unknown>(
  options?: ListWorkflowsOpts,
): Effect.Effect<O[], HatchetWorkflowError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const result = yield* Effect.tryPromise({
      try: () => client.workflows.list(options),
      catch: (error) =>
        new HatchetWorkflowError({
          message: "Failed to list workflows",
          cause: error,
        }),
    })

    return (result as { readonly workflows: O[] }).workflows
  })
