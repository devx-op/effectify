/**
 * @effectify/hatchet - Example Workflow
 *
 * This is a simple example of how to use @effectify/hatchet to create
 * workflows that can be registered with Hatchet.
 *
 * NOTE: This requires a running Hatchet instance to execute.
 * See docker-compose.yml in packages/hatchet/tests/integration/
 */

import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import {
  getValidatedInput,
  // HatchetClientLive,
  // HatchetConfigLayer,
  // registerWorkflow,
  task,
  workflow,
} from "@effectify/hatchet"

// ============================================================================
// Schema Definitions
// ============================================================================

/** Input schema for the user workflow */
const UserWorkflowInput = Schema.Struct({
  userId: Schema.String,
  action: Schema.Literals(["welcome", "reminder", "notification"]),
})

type UserWorkflowInputType = Schema.Schema.Type<typeof UserWorkflowInput>

// ============================================================================
// Task Definitions
// ============================================================================

/**
 * Task 1: Validate and process user input
 * This task validates the input and prepares the data for the next step
 */
const processUserTask = task(
  {
    name: "process-user",
    timeout: "30s",
  },
  Effect.gen(function*() {
    // Get and validate input using Effect Schema
    const input: UserWorkflowInputType = yield* getValidatedInput(
      UserWorkflowInput,
    )

    // Process the input (in a real app, this might query a database)
    const processed = {
      userId: input.userId,
      action: input.action,
      timestamp: new Date().toISOString(),
    }

    yield* Effect.log(
      `Processed user ${input.userId} for action ${input.action}`,
    )

    return processed
  }),
)

/**
 * Task 2: Send notification (simulated)
 * This task depends on process-user task
 */
const sendNotificationTask = task(
  {
    name: "send-notification",
    timeout: "60s",
    parents: ["process-user"], // Depends on process-user task
  },
  Effect.gen(function*() {
    // In a real app, this would send an actual notification
    // For now, we simulate a delay and return success
    yield* Effect.log("Sending notification...")

    // Simulate some processing time
    const result = {
      success: true,
      messageId: `msg-${Date.now()}`,
    }

    yield* Effect.log(`Notification sent successfully`)

    return result
  }),
)

// ============================================================================
// Workflow Definition
// ============================================================================

/**
 * Example workflow that demonstrates:
 * - Task chaining with dependencies (parents)
 * - Input validation using Effect Schema
 * - Type-safe task outputs
 */
export const exampleWorkflow = workflow({
  name: "user-notification-workflow",
  description: "Example workflow demonstrating @effectify/hatchet",
  version: "1.0.0",
})
  .task(processUserTask)
  .task(sendNotificationTask)

// ============================================================================
// Registration (for running the workflow)
// ============================================================================

// /**
//  * Environment configuration for Hatchet
//  *
//  * Hatchet Lite runs on:
//  * - UI: http://localhost:8888
//  * - gRPC: localhost:7077
//  *
//  * IMPORTANT: Use port 7077 for gRPC connections!
//  */
// const hatchetConfigLayer = HatchetConfigLayer({
//   token: process.env.HATCHET_TOKEN || "test-token",
//   host: process.env.HATCHET_HOST || "http://localhost:7077",
// });

// /**
//  * Full layer with all dependencies
//  */
// const appLayer = Layer.merge(hatchetConfigLayer, HatchetClientLive);

/**
 * Start the worker and register the workflow
 *
 * Usage:
 * ```typescript
 * // In your server startup code:
 * Effect.runPromise(
 *   registerWorkflow("my-worker", exampleWorkflow, appLayer)
 * )
 * ```
 *
 * Or with custom config:
 * ```typescript
 * Effect.runPromise(
 *   registerWorkflowWithConfig({
 *     workerName: "my-worker",
 *     workflow: exampleWorkflow,
 *     layer: appLayer,
 *     onStart: () => {
 *       console.log("Worker starting...");
 *     },
 *   })
 * )
 * ```
 */
// TODO: Fix type issue with HatchetStepContext
// export const startWorker = () => {
//   return registerWorkflow("example-worker", exampleWorkflow, appLayer);
// }

// ============================================================================
// Usage Example (for documentation)
// ============================================================================

/**
 * This is how you would trigger this workflow from your application:
 *
 * ```typescript
 * import { Hatchet } from "@hatchet-dev/typescript-sdk";
 *
 * const hatchet = new Hatchet({
 *   token: process.env.HATCHET_TOKEN,
 *   host: process.env.HATCHET_HOST,
 * });
 *
 * // Trigger the workflow
 * const result = await hatchet.client.workflow.run(
 *   "user-notification-workflow",
 *   {
 *   *   userId: "user-123",
 *   *   action: "welcome",
 *   * },
 *   {
 *   *   token: process.env.HATCHET_TOKEN,
 *   * }
 * );
 * ```
 */
