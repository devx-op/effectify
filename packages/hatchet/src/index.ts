// @effectify/hatchet - Native Effect v4 integration with Hatchet workflows
//
// This package provides an API that mirrors Hatchet native API but uses Effect:
// - workflow(): Create a workflow definition
// - task(): Define tasks as Effect instead of async functions
// - registerWorkflow(): Register and start a worker
//
// Usage:
//
//   import { workflow, task, registerWorkflow, getValidatedInput, HatchetStepContext } from "@effectify/hatchet"
//   import * as Effect from "effect/Effect"
//
//   const myTask = task(
//     { name: "my-task", timeout: "30s" },
//     Effect.gen(function*() {
//       const input = yield* getValidatedInput(MySchema)
//       return { result: "ok" }
//     })
//   )
//
//   const myWorkflow = workflow({ name: "my-workflow" }).task(myTask)
//
//   // Register and start worker
//   Effect.runPromise(
//     registerWorkflow("my-worker", myWorkflow, MyLayer)
//   )

// Core - Configuration, Client, Context, Errors
export * from "./core/index.js"

// Workflow - API that mirrors Hatchet
export { registerWorkflow, registerWorkflowWithConfig, task, workflow } from "./workflow/index.js"
export type { TaskOptions, WorkflowOptions } from "./workflow/index.js"

// Logging - Automatic log sync to Hatchet UI
export * from "./logging/index.js"

// Schema - Input validation
export * from "./schema/index.js"

// Testing utilities
export * from "./testing/index.js"

// Internal - not exported publicly (use workflow/task instead)
// export * from "./effectifier/index.js";
