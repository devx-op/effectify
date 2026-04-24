/**
 * @effectify/hatchet - Workflow Module
 *
 * Declarative workflow builder for defining Hatchet workflows with Effect.
 * Mirrors Hatchet API but uses Effect instead of async functions.
 */

// Main exports - same names as Hatchet API
export { EffectWorkflow, workflow } from "./workflow.js"
export { task } from "./task.js"
export { registerWorkflow, registerWorkflowWithConfig } from "./register.js"

// Types
export type { TaskOptions, TaskResult, WorkflowOptions } from "./types.js"
export type { TaskDefinition } from "./task.js"
export type { RegisterWorkflowConfig } from "./register.js"
