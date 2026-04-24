# Technical Design: @effectify/hatchet

**Version**: 1.0.0\
**Status**: Draft\
**Created**: March 2026

---

## 1. Architecture Overview

### 1.1 System Design

The `@effectify/hatchet` package bridges Effect v4 with Hatchet SDK v1.19.0, enabling users to write Hatchet workflows as pure `Effect<A, E, R>` computations. The architecture follows a layered pattern where each layer handles a specific concern:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Hatchet Engine (External)                         │
│                     (Workflow execution, retries, UI)                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │ HTTP/WebSocket
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        @effectify/hatchet                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │    Core     │  │ Effectifier │  │  Workflow   │  │  Logging    │       │
│  │  Config     │  │  execute() │  │  Builder    │  │ HatchetLog  │       │
│  │  Client     │  │ ManagedRt   │  │  task()     │  │ withLogger  │       │
│  │  Context    │  │             │  │  register   │  │             │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│         │                │                │                │               │
│         └────────────────┴────────────────┴────────────────┘               │
│                                    │                                          │
│                                    ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    ServiceMap Layer Composition                          │ │
│  │  ┌──────────────┐  ┌────────────────┐  ┌────────────────────┐        │ │
│  │  │HatchetConfig │  │HatchetClient   │  │HatchetStepContext  │        │ │
│  │  │   Service    │  │   Service      │  │     Service         │        │ │
│  │  └──────────────┘  └────────────────┘  └────────────────────┘        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │ Effect.provide()
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         User Application Code                                │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │  workflow({ name: "user-workflow" })                                  │   │
│  │    .task({ name: "task1" }, Effect.gen(function*() { ... }))        │   │
│  │    .task({ name: "task2", parents: ["task1"] }, Effect.gen(...))    │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

The execution flow follows this sequence:

```
1. User defines workflow with EffectWorkflow builder
2. registerWorkflow() creates Hatchet workflow + tasks
3. Hatchet worker starts, listening for workflow triggers
4. Hatchet calls task function with (input, context)
5. effectifyTask converts Promise → Effect execution:
   a. Inject HatchetStepContext as service
   b. Run Effect with ManagedRuntime
   c. Convert Success → return value
   d. Convert Failure → throw (triggers Hatchet retry)
6. Logs via HatchetLogger sync to Hatchet UI
7. Parent task outputs accessible via ctx.parentOutput()
```

---

## 2. Effectifier Design

### 2.1 Core Concept

The **effectifier** is the bridge that converts `Effect<A, E, R>` into a Hatchet-compatible Promise function `(input: unknown, ctx: HatchetContext) => Promise<A>`. This is necessary because Hatchet expects async functions, not Effect computations.

### 2.2 Effectifier Implementation

```typescript
// packages/hatchet/src/effectifier/execute.ts

import { Cause, Effect, ManagedRuntime, ServiceMap } from "effect"
import type { Context as HatchetContext } from "@hatchet-dev/typescript-sdk"
import { HatchetStepContext } from "../core/context"

/**
 * effectifyTask: Converts Effect<A, E, R> to Hatchet-compatible Promise function
 *
 * Key behaviors:
 * - Injects HatchetStepContext as a service
 * - Uses ManagedRuntime to execute the Effect
 * - Converts Success → return value
 * - Converts Failure → throw Error (triggers Hatchet retries)
 */
export const effectifyTask = <A, E, R>(
  effect: Effect.Effect<A, E, R | HatchetStepContext>,
  runtime: ManagedRuntime.ManagedRuntime<R, never>,
) => {
  return async (input: unknown, ctx: HatchetContext<any, any>): Promise<A> => {
    // Step 1: Provide HatchetStepContext as a service
    const effectWithContext = Effect.provideService(
      effect,
      HatchetStepContext,
      ctx,
    )

    // Step 2: Execute with ManagedRuntime
    const exit = await runtime.runPromiseExit(effectWithContext)

    // Step 3: Convert result
    if (exit._tag === "Success") {
      return exit.value
    } else {
      // Failure → throw for Hatchet retry mechanism
      const error = Cause.squash(exit.cause)
      throw error instanceof Error ? error : new Error(String(error))
    }
  }
}

/**
 * createEffectifierFromLayer: Factory that creates an effectifier
 * from a Layer<R, any, never>
 *
 * The layer provides all dependencies needed by the Effects
 */
export const createEffectifierFromLayer = <R>(
  layer: Layer.Layer<R, any, never>,
) => {
  // Create persistent runtime for all tasks
  const runtime = ManagedRuntime.make(layer)

  return <A, E>(effect: Effect.Effect<A, E, R | HatchetStepContext>) => effectifyTask(effect, runtime)
}
```

### 2.3 Error Propagation Strategy

The effectifier must convert Effect failures to thrown exceptions because Hatchet's retry mechanism works on thrown errors:

| Effect Result         | Hatchet Behavior                              |
| --------------------- | --------------------------------------------- |
| `Exit.success(value)` | Return `value` to workflow                    |
| `Exit.failure(cause)` | Throw error → Hatchet retries (if configured) |

**Critical**: Not all errors should trigger retries. The design allows users to:

- Use `Effect.fail()` for recoverable errors (triggers retry)
- Use `Effect.die()` for fatal errors (no retry)
- Configure retries per-task in the workflow definition

### 2.4 Runtime Lifecycle

The ManagedRuntime is created once per workflow registration and reused across all task executions:

```typescript
// In registerWorkflow()
const runtime = ManagedRuntime.make(layer)

// Each task gets the same runtime
wf.tasks.forEach((taskDef) => {
  hatchetWorkflow.task({
    name: taskDef.options.name,
    fn: effectifyTask(taskDef.effect, runtime), // Same runtime instance
  })
})
```

**Important**: The runtime should be cleaned up when the worker stops. This will be handled in the worker lifecycle management.

---

## 3. Workflow Builder Design

### 3.1 EffectWorkflow Class

The `EffectWorkflow<R>` class provides a builder pattern for defining workflows:

```typescript
// packages/hatchet/src/workflow/workflow.ts

import { Effect } from "effect"
import type { TaskDefinition, TaskOptions, WorkflowOptions } from "./types"

export class EffectWorkflow<R> {
  readonly tasks: TaskDefinition<R>[] = []

  constructor(
    readonly options: WorkflowOptions,
    readonly dependencies: R = undefined as R,
  ) {}

  /**
   * Adds a task to the workflow
   * Accumulates dependencies via union types
   */
  task<A, E, R2>(
    options: TaskOptions,
    effect: Effect.Effect<A, E, R2>,
  ): EffectWorkflow<R | R2> {
    this.tasks.push({ options, effect } as TaskDefinition<R | R2>)
    return this as any
  }
}

export const workflow = (options: WorkflowOptions) => new EffectWorkflow<never>(options)
```

### 3.2 Type Inference Flow

The type system tracks accumulated dependencies through the builder:

```
workflow({ name: "my-workflow" })
  .task({ name: "task1" }, Effect<..., ..., Database>)     // R = Database
  .task({ name: "task2" }, Effect<..., ..., EmailService>) // R = Database | EmailService
  .task({ name: "task3" }, Effect<..., ..., Logger>)       // R = Database | EmailService | Logger
```

This enables:

- Full type inference for all dependencies
- Compile-time error if a required service is missing
- Layer construction from accumulated types

### 3.3 Task Options Mapping

The SDK uses different terminology than the internal types:

```typescript
// packages/hatchet/src/workflow/types.ts

import type { RetryOpts, TaskConcurrency } from "@hatchet-dev/typescript-sdk"

export interface TaskOptions {
  readonly name: string
  readonly timeout?: string // SDK: execution_timeout
  readonly retries?: number // SDK: retries (RetryOpts)
  readonly rateLimits?: Array<{ key: string; limit: number; duration: string }>
  readonly concurrency?: TaskConcurrency[]
  readonly parents?: string[] // DAG dependencies
}

export interface WorkflowOptions {
  readonly name: string
  readonly description?: string
  readonly version?: string
  readonly sticky?: boolean
  readonly concurrency?: TaskConcurrency[]
}
```

### 3.4 Registration Flow

The `registerWorkflow` function orchestrates the entire registration:

```typescript
// packages/hatchet/src/workflow/register.ts

export const registerWorkflow = <R>(
  workerName: string,
  wf: EffectWorkflow<R>,
  layer: Layer.Layer<R, any, never>,
): Effect.Effect<void, never, HatchetClientService> =>
  Effect.gen(function*() {
    // 1. Get Hatchet client
    const hatchet = yield* HatchetClientService

    // 2. Create runtime for effect execution
    const runtime = ManagedRuntime.make(layer)

    // 3. Create Hatchet workflow
    const hatchetWorkflow = hatchet.workflow<any, any>({
      name: wf.options.name,
      ...(wf.options.description && { description: wf.options.description }),
      ...(wf.options.version && { version: wf.options.version }),
    })

    // 4. Register each task
    wf.tasks.forEach((taskDef) => {
      hatchetWorkflow.task({
        name: taskDef.options.name,
        fn: effectifyTask(taskDef.effect, runtime),
        ...mapTaskOptions(taskDef.options), // Convert to SDK format
      })
    })

    // 5. Create and start worker
    const worker = yield* Effect.tryPromise({
      try: () => hatchet.worker(workerName, { workflows: [hatchetWorkflow] }),
      catch: (e) => new HatchetError({ message: "Failed to create worker", cause: e }),
    })

    yield* Effect.log(
      `Workflow '${wf.options.name}' registered on worker '${workerName}'`,
    )

    yield* Effect.tryPromise({
      try: () => worker.start(),
      catch: (e) => new HatchetError({ message: "Failed to start worker", cause: e }),
    })
  })
```

---

## 4. ServiceMap Integration

### 4.1 Service Hierarchy

Three core services form the foundation:

```
ServiceMap
├── HatchetConfig        (static configuration)
│   └── { token, host, namespace }
├── HatchetClientService (Hatchet SDK client)
│   └── HatchetClient instance
└── HatchetStepContext   (per-task execution context)
    └── HatchetContext from SDK
```

### 4.2 HatchetConfig Service

```typescript
// packages/hatchet/src/core/config.ts

import { Config, Effect, Layer, Schema, ServiceMap } from "effect"

const HatchetConfigSchema = Schema.Struct({
  token: Schema.String,
  host: Schema.String.pipe(Schema.defaultTo("http://localhost:8080")),
  namespace: Schema.optional(Schema.String),
})

type HatchetConfigType = Schema.Schema.Type<typeof HatchetConfigSchema>

/**
 * HatchetConfig: Static configuration for Hatchet connection
 * Uses ServiceMap.Service (NOT Context.Tag from v3)
 */
export class HatchetConfig extends ServiceMap.Service<
  HatchetConfig,
  HatchetConfigType
>()("HatchetConfig") {}

export const HatchetConfigLayer = (config: HatchetConfigType) => Layer.succeed(HatchetConfig, config)

export const HatchetConfigLayerFromEnv = (
  config: Config.Wrap<HatchetConfigType>,
): Layer.Layer<HatchetConfig, Config.ConfigError> =>
  Layer.effect(HatchetConfig)(Effect.map(Config.unwrap(config), (c) => c))
```

### 4.3 HatchetClientService

```typescript
// packages/hatchet/src/core/client.ts

import { Data, Effect, Layer, ServiceMap } from "effect"
import { HatchetClient } from "@hatchet-dev/typescript-sdk"

/**
 * HatchetError: Tagged error for Hatchet-specific failures
 */
export class HatchetError extends Data.TaggedError(
  "@effectify/hatchet/HatchetError",
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * HatchetClientService: The SDK client instance
 */
export class HatchetClientService extends ServiceMap.Service<
  HatchetClientService,
  HatchetClient
>()("HatchetClient") {}

/**
 * HatchetClientLive: Creates client from config
 */
export const HatchetClientLive = Layer.effect(HatchetClientService)(
  Effect.gen(function*() {
    const config = yield* HatchetConfig
    const hatchet = HatchetClient.init({
      token: config.token,
      host_port: config.host,
    })
    return hatchet
  }),
)
```

### 4.4 HatchetStepContext

```typescript
// packages/hatchet/src/core/context.ts

import { Effect, ServiceMap } from "effect"
import type { Context as HatchetContext } from "@hatchet-dev/typescript-sdk"

/**
 * HatchetStepContext: Per-task execution context from Hatchet SDK
 *
 * Provides access to:
 * - input: workflow input (property, not method in SDK v1)
 * - parentOutput(taskRef): output from parent tasks
 * - log(): write to Hatchet UI
 * - logger: structured logging
 */
export class HatchetStepContext extends ServiceMap.Service<
  HatchetStepContext,
  HatchetContext<any, any>
>()("HatchetStepContext") {}

/**
 * getHatchetInput: Helper to extract typed input from context
 */
export const getHatchetInput = <T>() => Effect.map(HatchetStepContext, (ctx) => ctx.input as T)
```

---

## 5. Logging Architecture

### 5.1 HatchetLogger Design

The custom logger intercepts Effect.log() calls and forwards them to Hatchet:

```typescript
// packages/hatchet/src/logging/hatchet-logger.ts

import { Effect, Logger, Option, ServiceMap } from "effect"
import { HatchetStepContext } from "../core/context"

/**
 * HatchetLogger: Custom Effect Logger that forwards logs to Hatchet UI
 *
 * Flow:
 * 1. Effect.log() is called in user code
 * 2. Logger.make() receives the log entry
 * 3. Check if HatchetStepContext exists in the fiber
 * 4. If yes → forward to ctx.log()
 * 5. Always output to console for development
 */
export const HatchetLogger = Logger.make(({ logLevel, message, context }) => {
  const msg = typeof message === "string" ? message : String(message)
  const formatted = `[${logLevel.label}] ${msg}`

  // Check if we're in a Hatchet task context
  const hatchetCtxOpt = ServiceMap.getOption(context, HatchetStepContext)

  if (Option.isSome(hatchetCtxOpt)) {
    // We're inside a task → forward to Hatchet
    hatchetCtxOpt.value.log(formatted)
  }

  // Always log to console
  console.log(formatted)
})

/**
 * withHatchetLogger: Wraps an Effect with the Hatchet logger
 *
 * Note: Logger.replace doesn't exist in v4 → use Effect.withLogger
 */
export const withHatchetLogger = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> => Effect.withLogger(effect, HatchetLogger)
```

### 5.2 Log Level Mapping

Effect log levels map to Hatchet:

| Effect LogLevel | Hatchet Method                    |
| --------------- | --------------------------------- |
| Debug           | `ctx.logger.debug()`              |
| Info            | `ctx.log()` / `ctx.logger.info()` |
| Warning         | `ctx.logger.warn()`               |
| Error           | `ctx.logger.error()`              |
| Fatal           | `ctx.logger.error()`              |

---

## 6. Schema Integration

### 6.1 Input Validation

```typescript
// packages/hatchet/src/schema/get-validated-input.ts

import { Effect, Schema } from "effect"
import { HatchetStepContext } from "../core/context"

/**
 * getValidatedInput: Extract and validate workflow input
 *
 * Uses Schema.decodeUnknown from the effect package
 * (NOT @effect/schema - it's all in one package in v4)
 */
export const getValidatedInput = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
): Effect.Effect<A, Schema.ParseError, R | HatchetStepContext> =>
  Effect.gen(function*() {
    const ctx = yield* HatchetStepContext
    const rawInput = ctx.input
    const decode = Schema.decodeUnknown(schema)
    return yield* decode(rawInput)
  })
```

---

## 7. Testing Strategy

### 7.1 Unit Testing Utilities

```typescript
// packages/hatchet/src/testing/mock-context.ts

import { Effect, Exit, ServiceMap } from "effect"
import { HatchetStepContext } from "../core/context"

/**
 * createMockStepContext: Creates a mock Hatchet context
 * Matches SDK v1.19.0 interface
 */
export const createMockStepContext = (input?: unknown) => ({
  input: input ?? {},
  parentOutput: async () => null,
  log: async (msg: string) => console.log(`[HATCHET] ${msg}`),
  logger: {
    info: async (msg: string) => console.info(`[INFO] ${msg}`),
    debug: async (msg: string) => console.debug(`[DEBUG] ${msg}`),
    warn: async (msg: string) => console.warn(`[WARN] ${msg}`),
    error: async (msg: string) => console.error(`[ERROR] ${msg}`),
  },
  workflowRunId: () => "test-run-id",
  workflowName: () => "test-workflow",
  taskName: () => "test-task",
  retryCount: () => 0,
})

/**
 * runTestTask: Execute an Effect task with mock context
 * Returns Exit for detailed result inspection
 */
export const runTestTask = <A, E, R>(
  effect: Effect.Effect<A, E, R | HatchetStepContext>,
  layer: Layer.Layer<R, any, never>,
  mockContext?: any,
): Effect.Effect<Exit.Exit<A, E>, never, R> => {
  const ctx = mockContext ?? createMockStepContext()

  return Effect.gen(function*() {
    const runtime = yield* Effect.runtime<R>()

    return yield* Effect.provideService(effect, HatchetStepContext, ctx).pipe(
      Effect.exit,
      Effect.provideLayer(layer),
    )
  })
}
```

### 7.2 Integration Testing

Integration tests require Docker Compose:

```yaml
# packages/hatchet/tests/integration/docker-compose.yml
version: "3.8"

services:
  postgres-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: hatchet
      POSTGRES_PASSWORD: hatchet
      POSTGRES_DB: hatchet
    tmpfs:
      - /var/lib/postgresql/data

  hatchet-test:
    image: ghcr.io/hatchet-dev/hatchet:latest
    environment:
      - HATCHET_SERVER_TOKEN=test-token
      - DATABASE_URL=postgresql://hatchet:hatchet@postgres-test:5432/hatchet
    depends_on:
      postgres-test:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
```

---

## 8. Type Flow

### 8.1 Input Type Propagation

```
User defines Schema
       │
       ▼
getValidatedInput(Schema)
       │
       ▼
Effect<A, ParseError, R | HatchetStepContext>
       │
       ▼
Effect.gen yields validated input (type-safe)
```

### 8.2 ServiceMap Type Inference

```
workflow({ name: "wf" })
  .task(opts, Effect<..., ..., Database>)
  .task(opts, Effect<..., ..., EmailService>)
       │
       ▼
EffectWorkflow<Database | EmailService>
       │
       ▼
Layer<Database | EmailService>
       │
       ▼
ManagedRuntime.make(layer)
       │
       ▼
Effectifier: (input, ctx) => Promise<A>
```

---

## 9. Package Structure

```
packages/hatchet/
├── project.json           # Nx project config (follows prisma pattern)
├── package.json          # Package manifest
├── tsconfig.json         # TypeScript config
├── vitest.config.ts      # Test config
├── src/
│   ├── index.ts          # Public exports
│   ├── core/
│   │   ├── config.ts     # HatchetConfig + Layers
│   │   ├── client.ts     # HatchetClientService + HatchetError
│   │   └── context.ts   # HatchetStepContext
│   ├── effectifier/
│   │   ├── execute.ts    # effectifyTask + createEffectifierFromLayer
│   │   └── types.ts      # Internal types
│   ├── workflow/
│   │   ├── workflow.ts  # EffectWorkflow class + workflow()
│   │   ├── task.ts       # task() function
│   │   ├── register.ts   # registerWorkflow()
│   │   └── types.ts      # TaskOptions, WorkflowOptions
│   ├── logging/
│   │   └── hatchet-logger.ts  # HatchetLogger + withHatchetLogger
│   ├── schema/
│   │   └── get-validated-input.ts  # getValidatedInput
│   └── testing/
│       └── mock-context.ts   # Test utilities
├── tests/
│   ├── unit/
│   │   ├── client.test.ts
│   │   ├── effectifier.test.ts
│   │   ├── logger.test.ts
│   │   └── workflow.test.ts
│   └── integration/
│       ├── docker-compose.yml
│       └── workflow.test.ts
└── README.md
```

---

## 10. Key Design Decisions

### 10.1 Effect v4 API Choices

| Decision                                | Rationale                                 |
| --------------------------------------- | ----------------------------------------- |
| `ServiceMap.Service` over `Context.Tag` | Context module doesn't exist in v4        |
| `ManagedRuntime.make(layer)`            | `Effect.runtime<R>()` doesn't exist in v4 |
| `Effect.withLogger(effect, logger)`     | `Logger.replace` doesn't exist in v4      |
| `ServiceMap.getOption`                  | Context module doesn't exist              |
| Schema from `effect` package            | `@effect/schema` is deprecated/merged     |

### 10.2 Hatchet SDK v1.19.0 API Choices

| Decision                    | Rationale                                |
| --------------------------- | ---------------------------------------- |
| `.task()` not `.step()`     | SDK v1 uses task terminology             |
| `ctx.input` property        | SDK v1 has input as property, not method |
| `ctx.parentOutput(taskRef)` | Replaces deprecated `stepOutput()`       |

### 10.3 Error Handling Strategy

- **Recoverable errors**: Use `Effect.fail()` → converted to thrown Error → Hatchet retries
- **Fatal errors**: Use `Effect.die()` or `Effect.exit()` → no retry
- **Tagged errors**: Use `HatchetError` for Hatchet-specific failures

---

## 11. Risks and Mitigations

| Risk                         | Likelihood | Impact | Mitigation                                   |
| ---------------------------- | ---------- | ------ | -------------------------------------------- |
| SDK API changes              | Medium     | High   | Pin to v1.19.0, verify on updates            |
| Effect v4 breaking changes   | Low        | High   | Use only verified APIs from effect-reference |
| Runtime memory leaks         | Medium     | Medium | Ensure runtime disposal in worker stop       |
| Retry loop on startup errors | Medium     | High   | Use Effect.die() for fatal startup errors    |

---

## 12. Dependencies

```json
{
  "dependencies": {
    "@hatchet-dev/typescript-sdk": "^1.19.0"
  },
  "peerDependencies": {
    "effect": "catalog:"
  },
  "devDependencies": {
    "@effect/vitest": "catalog:",
    "@types/node": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

---

## 13. Next Steps

1. **Initialize package structure** following `@effectify/prisma` patterns
2. **Implement core services**: HatchetConfig, HatchetClientService, HatchetStepContext
3. **Build effectifier**: effectifyTask with ManagedRuntime integration
4. **Create workflow builder**: EffectWorkflow with task chaining
5. **Add logging**: HatchetLogger with Effect.withLogger
6. **Schema utilities**: getValidatedInput
7. **Testing utilities**: createMockStepContext, runTestTask
8. **Write unit tests** (>90% coverage)
9. **Docker Compose setup** for integration tests
10. **Integration tests** against real Hatchet

---

_Document created: March 2026_
_Version: 1.0.0_
