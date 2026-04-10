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
  workflow: any,
  opts?: CreateWorkflowOpts,
): Effect.Effect<O, HatchetWorkflowError, HatchetClientService> =>
  Effect.tryPromise({
    try: async () => {
      const client = await getHatchetClient()
      const workflowsClient = (client as any).workflows
      const result = await workflowsClient.create(workflow, opts)
      return result as O
    },
    catch: (error) => HatchetWorkflowError.of(`Failed to create workflow`, opts?.name, error),
  })

/**
 * Get a workflow by name
 *
 * @param name - The name of the workflow to get
 * @returns Effect that resolves with the workflow details
 */
export const getWorkflow = <O = unknown>(
  name: string,
): Effect.Effect<O, HatchetWorkflowError, HatchetClientService> =>
  Effect.tryPromise({
    try: async () => {
      const client = await getHatchetClient()
      const workflowsClient = (client as any).workflows
      const result = await workflowsClient.get(name)
      return result as O
    },
    catch: (error) => HatchetWorkflowError.of(`Failed to get workflow "${name}"`, name, error),
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
  Effect.tryPromise({
    try: async () => {
      const client = await getHatchetClient()
      const workflowsClient = (client as any).workflows
      const result = await workflowsClient.list(options)
      return result.workflows as O[]
    },
    catch: (error) => HatchetWorkflowError.of("Failed to list workflows", undefined, error),
  })
