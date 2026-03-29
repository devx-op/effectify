# @effectify/hatchet

> Native Effect v4 integration with Hatchet workflows

`@effectify/hatchet` provides a native Effect v4 API for creating and running Hatchet workflows. Write your tasks as `Effect`s and let the package handle the conversion to Hatchet's step functions.

## Features

- **Native Effect API** — Write tasks using `Effect<A, E, R>` instead of async functions
- **Type-safe inputs** — Built-in schema validation for task inputs using Effect's Schema
- **Automatic logging** — Logs are automatically synced to the Hatchet UI
- **Familiar API** — API mirrors Hatchet's native API for easy migration
- **Full TypeScript** — Complete type inference and IntelliSense

## Installation

```bash
pnpm add @effectify/hatchet effect
```

## Quick Start

```typescript
import { registerWorkflow, task, workflow } from "@effectify/hatchet"
import * as Effect from "effect/Effect"

// Define your task as an Effect
const myTask = task(
  { name: "hello-task" },
  Effect.succeed({ message: "Hello from Effect!" }),
)

// Create a workflow
const myWorkflow = workflow({
  name: "hello-workflow",
  description: "My first Effect-powered workflow",
}).task(myTask)

// Register and start the worker
import * as Layer from "effect/Layer"

const configLayer = HatchetConfigLayer({
  token: process.env.HATCHET_TOKEN!,
  host: process.env.HATCHET_HOST || "http://localhost:8080",
})

Effect.runPromise(registerWorkflow("my-worker", myWorkflow, configLayer))
```

## API Reference

### `workflow(options)`

Creates a new workflow definition.

```typescript
const wf = workflow({
  name: "my-workflow",
  description: "Optional description",
  version: "1.0.0",
})
```

**Options:**

- `name` (required) — Workflow name
- `description` — Workflow description
- `version` — Workflow version (default: "1.0.0")

**Returns:** `EffectWorkflow` — Chainable workflow builder

### `.task(taskDefinition)`

Adds a task to the workflow. Returns the workflow for chaining.

```typescript
workflow({ name: "my-workflow" }).task(task1).task(task2) // Can depend on task1 via parents
```

### `task(options, effect)`

Defines a task as an Effect.

```typescript
const myTask = task(
  {
    name: "my-task",
    timeout: "30s", // Optional timeout
    parents: ["previous-task"], // Optional dependencies
  },
  Effect.gen(function*() {
    // Your Effect code here
    return { result: "done" }
  }),
)
```

**Options:**

- `name` (required) — Task name
- `timeout` — Task timeout (e.g., "30s", "1m")
- `parents` — Array of parent task names

**Effect:** Any `Effect<A, E, R>` — The task logic

### `registerWorkflow(workerName, workflow, layer)`

Registers a workflow and starts a worker.

```typescript
Effect.runPromise(registerWorkflow("my-worker", myWorkflow, configLayer))
```

### `registerWorkflowWithConfig(workerName, workflow, config)`

Alternative registration with inline config.

```typescript
Effect.runPromise(
  registerWorkflowWithConfig("my-worker", myWorkflow, {
    token: "...",
    host: "http://localhost:7077", // gRPC port
  }),
)
```

## Input Validation

Use `getValidatedInput` to validate and parse task inputs with type safety:

```typescript
import { Schema } from "effect"
import { getValidatedInput } from "@effectify/hatchet"

const UserInputSchema = Schema.Struct({
  userId: Schema.String,
  action: Schema.Literal("create", "update", "delete"),
})

const myTask = task(
  { name: "process-user" },
  Effect.gen(function*() {
    const input = yield* getValidatedInput(UserInputSchema)
    // input is typed as { userId: string, action: "create" | "update" | "delete" }
    return { processed: input.userId }
  }),
)
```

## Logging

The `withHatchetLogger` function adds automatic log syncing to any Effect:

```typescript
import { task, withHatchetLogger, workflow } from "@effectify/hatchet"

const loggedTask = task(
  { name: "logged-task" },
  withHatchetLogger(
    Effect.gen(function*() {
      yield* Effect.log("Starting work...")
      const result = yield* Effect.succeed({ data: "done" })
      yield* Effect.log("Work complete!")
      return result
    }),
  ),
)
```

## Testing

Use the testing utilities to create mock contexts and test tasks in isolation:

```typescript
import { createMockContext, testTask } from "@effectify/hatchet/testing"

const mockContext = createMockContext<{ userId: string }>({
  workflow: { runId: "test-run", workflowId: "test-wf" },
  step: { name: "test-step" },
  input: { userId: "test-user" },
})

const result = await testTask(myTask, mockContext)
```

## Error Handling

The package provides typed errors using Effect's `Data.TaggedError`:

```typescript
import { HatchetError, HatchetRetryError, HatchetTimeoutError } from "@effectify/hatchet"

const myTask = task(
  { name: "faulty-task" },
  Effect.gen(function*() {
    yield* new HatchetError({ message: "Something went wrong" })
    // Or use specific error types:
    // yield* new HatchetTimeoutError({ message: "Task timed out" })
  }),
)
```

## Effect Patterns

This package follows Effect v4 best practices:

- Use `Effect.gen` for async task logic
- Use `yield*` for direct error yielding (not `Effect.fail`)
- Use `Schema` from the `effect` package for validation
- Use `Layer` for dependency injection

```typescript
// ✅ Correct
yield * new HatchetError({ message: "Failed" })

// ❌ Don't use Effect.fail
yield * Effect.fail(new Error("Failed")) // Avoid this
```

## Requirements

- Effect v4 (v4.0.0 or later)
- Hatchet v1.19.0+
- TypeScript 5.0+

## License

MIT
