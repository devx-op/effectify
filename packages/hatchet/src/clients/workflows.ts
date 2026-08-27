/**
 * @effectify/hatchet - Workflows Client
 *
 * Client for managing workflows in Hatchet
 */

import * as Effect from "effect/Effect"
import type { WorkflowsClient } from "@hatchet-dev/typescript-sdk"
import type { HatchetClientService } from "../core/client.js"
import { getHatchetClient } from "../core/client.js"
import { HatchetWorkflowError } from "../core/error.js"

/**
 * Type audit:
 * - `WorkflowTarget` and `ListWorkflowsOpts` are direct SDK derivations for passthrough calls.
 * - Tagged errors stay local for the Effect boundary.
 */
export type WorkflowTarget = Parameters<WorkflowsClient["delete"]>[0]

/**
 * Get a workflow by name
 *
 * @param name - The name of the workflow to get
 * @returns Effect that resolves with the workflow details
 */
export const getWorkflow = <O = unknown>(name: string): Effect.Effect<O, HatchetWorkflowError, HatchetClientService> =>
  Effect.gen(function* () {
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

export type ListWorkflowsOpts = Parameters<WorkflowsClient["list"]>[0]

/**
 * List all workflows
 *
 * @param options - Options for filtering and paginating workflows
 * @returns Effect that resolves with the list of workflows
 */
export const listWorkflows = <O = unknown>(
  options?: ListWorkflowsOpts,
): Effect.Effect<O[], HatchetWorkflowError, HatchetClientService> =>
  Effect.gen(function* () {
    const client = yield* getHatchetClient()
    const result = yield* Effect.tryPromise({
      try: () => client.workflows.list(options),
      catch: (error) =>
        new HatchetWorkflowError({
          message: "Failed to list workflows",
          cause: error,
        }),
    })

    return (result.rows ?? []) as O[]
  })

export const deleteWorkflow = (
  workflow: WorkflowTarget,
): Effect.Effect<void, HatchetWorkflowError, HatchetClientService> =>
  Effect.gen(function* () {
    const client = yield* getHatchetClient()

    yield* Effect.tryPromise({
      try: () => client.workflows.delete(workflow),
      catch: (error) =>
        new HatchetWorkflowError({
          message: `Failed to delete workflow "${typeof workflow === "string" ? workflow : "workflow"}"`,
          workflowName: typeof workflow === "string" ? workflow : undefined,
          cause: error,
        }),
    })
  })
