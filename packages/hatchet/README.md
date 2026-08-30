# @effectify/hatchet

`@effectify/hatchet` is a task-first, Effect-native Hatchet integration. Consumers declare `Task` values, compose `Hatchet.layer`, and yield `Hatchet` operations. SDK construction, configuration acquisition, task registration, worker lifecycle, lazy initialization, retries, and cleanup remain package-owned.

## Define a Task

```ts
import { Hatchet, Task } from "@effectify/hatchet"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

const GreetingInput = Schema.Struct({
  name: Schema.NonEmptyString,
})
const GreetingOutput = Schema.Struct({
  greeting: Schema.String,
})

const greet = Task.make({
  name: "greet",
  input: GreetingInput,
  output: GreetingOutput,
  fn: ({ name }) => Effect.succeed({ greeting: `Hello, ${name}!` }),
})

const AppLayer = Layer.mergeAll(
  DatabaseLive,
  Hatchet.layer({ tasks: [greet] }),
)

const program = Hatchet.run(greet, { name: "Ada" }).pipe(
  Effect.provide(AppLayer),
)
```

`input` and `output` are optional Effect Schema codecs. Input is decoded before the task body; output is validated and encoded at the transport boundary. Boundary failures use `TaskSchemaError` with an `input` or `output` phase. Schema-free tasks remain supported.

## Declarative metadata

Package-owned `RateLimit` and `Trigger` values keep Hatchet SDK declaration types behind the adapter boundary. Values are immutable, validated before SDK or worker mutation, and translated without dropping duplicates or optional fields.

```ts
import { RateLimit, Task, Trigger } from "@effectify/hatchet"

const notified = Task.make({
  name: "customer-notified",
  rateLimits: [RateLimit.make({ units: 10, duration: "minute", key: "customer" })],
  triggers: [Trigger.event("customer:updated")],
  fn: (input: { readonly customerId: string }) => Effect.succeed(input),
})
```

Empty names, malformed rate limits or triggers, unknown declaration kinds, and duplicate task identities fail with `TaskDeclarationError` before registration starts.

## Durable tasks

`Task.durable` uses the same Effect-first Schema and requirements contract while exposing durable invocation metadata to the handler. The live adapter registers it with Hatchet's durable task API; the in-memory adapter supplies invocation count `0` for deterministic tests.

```ts
const durableGreeting = Task.durable({
  name: "durable-greeting",
  input: GreetingInput,
  output: GreetingOutput,
  fn: ({ name }, context) =>
    Effect.succeed({
      greeting: `Hello, ${name}! Invocation ${context.invocationCount}`,
    }),
})
```

Durable handlers receive `workflowRunId`, `taskRunExternalId`, `interruption`, and `invocationCount`. SDK abort signals interrupt the Effect execution, task requirements are captured when the Layer is acquired, and unknown task identities fail with `MissingTaskError` rather than dispatching another declaration.

## Dispatch without waiting

`Hatchet.runNoWait(task, input)` dispatches the task and returns a scoped `RunHandle` before the task completes. Its branded `id` identifies the run, `await` produces the same Schema-decoded output as `Hatchet.run`, and `cancel` interrupts an outstanding run.

```ts
const program = Effect.gen(function*() {
  const handle = yield* Hatchet.runNoWait(greet, { name: "Ada" })
  yield* Effect.log("Continue independent Effect work", handle.id)
  return yield* handle.await
}).pipe(Effect.provide(AppLayer))
```

Outstanding in-memory runs are interrupted when their Layer scope closes. Live handles delegate dispatch, result, and cancellation to Hatchet while mapping SDK failures into package errors.

Run the live dispatch example on the repository's supported Node version (`>=22.22`):

```sh
HATCHET_CLIENT_TOKEN='<token>' node --experimental-strip-types packages/hatchet/scripts/test-workflow.ts
```

The upstream Hatchet SDK keeps its run-result gRPC transport alive and currently exposes no client-level close/dispose API. The executable example therefore terminates explicitly only after its Effect completes and the Hatchet Layer has stopped its worker. This workaround is CLI-only; package source never terminates the process.

## Schedule once

`Hatchet.schedule` creates a one-time task trigger with either an exact `At` date or an `After` `Duration.Input`. It returns a branded schedule record containing its id and exact trigger time. `getSchedule` returns `Some` while the owned schedule is waiting or executing. `deleteSchedule` returns `true` and interrupts it in either state, then returns `false` after completion, deletion, or absence. Cron APIs remain separate for recurring schedules.

```ts
const record = yield * Hatchet.schedule(greet, { name: "Ada" }, {
  _tag: "After",
  delay: "5 seconds",
})
const pending = yield * Hatchet.getSchedule(record.id)
const deleted = yield * Hatchet.deleteSchedule(record.id)
```

Run the live scheduling example with:

```sh
HATCHET_CLIENT_TOKEN='<token>' node --experimental-strip-types packages/hatchet/scripts/test-schedule.ts
```

## Cron records

`CronExpression.parse` accepts exactly five Hatchet-compatible fields, validates their semantics with Effect Cron, and preserves a normalized source string. `CronExpression.next` and `CronExpression.nextRuns` provide local previews without exposing the SDK transport. Pass the parsed value as `schedule` to `createCron`; the package serializes its preserved source and Schema-encodes task input.

```ts
const schedule = yield * CronExpression.parse("0 9 * * 1-5")
const preview = CronExpression.nextRuns(schedule, 3)
const cron = yield * Hatchet.createCron(greet, {
  name: "weekday-greeting",
  schedule,
  input: { name: "Ada" },
})
```

`getCron`, filtered/paginated `listCrons`, and `deleteCron` complete the package lifecycle. Creation is non-idempotent: in-memory calls get distinct IDs, while live duplicate policy is backend-owned, so callers must not assume idempotency. In-memory records do not auto-fire. Run the live lifecycle with `HATCHET_CLIENT_TOKEN='<token>' node --experimental-strip-types packages/hatchet/scripts/test-cron.ts`.

## Lazy Layer

`Hatchet.layer({ tasks })` is inert when acquired. It does not read configuration, construct the SDK, contact Hatchet, register tasks, or start a worker until the first `Hatchet` operation.

Concurrent first operations share one acquisition attempt. A successful worker is reused for the Layer scope. A failed attempt is cleaned up and returned to all waiters; the next operation retries. Closing the Layer scope stops the worker exactly once.

Explicit decoded options and custom Effect Config are supported:

```ts
const explicit = Hatchet.layer({
  tasks: [greet],
  options: {
    client: { token },
    worker: {
      name: "greeting-worker",
      slots: 4,
      readyTimeoutMs: 10_000,
      stopTimeoutMs: 5_000,
    },
  },
})

const configured = Hatchet.layer({
  tasks: [greet],
  config: applicationHatchetConfig,
})
```

Without `options` or `config`, the package uses its Effect Config environment contract. `HATCHET_CLIENT_TOKEN` is required on first operation. Optional keys are `HATCHET_HOST_PORT`, `HATCHET_API_URL`, `HATCHET_TLS_STRATEGY`, `HATCHET_TENANT_ID`, `HATCHET_NAMESPACE`, `HATCHET_LOG_LEVEL`, `HATCHET_WORKER_NAME`, `HATCHET_WORKER_SLOTS`, `HATCHET_WORKER_READY_TIMEOUT_MS`, and `HATCHET_WORKER_STOP_TIMEOUT_MS`.

Omitting TLS strategy preserves the SDK secure default. Local plaintext Hatchet Lite deployments must explicitly use `none`.

## Public API

- `Task.make(options)` — declarative task identity with optional input/output Schema
- `Task.durable(options)` — durable declaration with `Task.DurableContext`
- `RateLimit.make(options)` — immutable rate-limit metadata
- `Trigger.event(name)`, `Trigger.cron(expression)` — immutable trigger metadata
- `Hatchet.layer({ tasks, options?, config? })` — package-owned lazy live Layer
- `Hatchet.layerInMemory` — deterministic scoped adapter for tests
- `Hatchet.run(task, input)` — await task output
- `Hatchet.runNoWait(task, input)` — obtain a run handle
- `Hatchet.schedule`, `Hatchet.getSchedule`, `Hatchet.deleteSchedule`
- `Hatchet.cancelRun`
- `CronExpression.parse`, `CronExpression.next`, `CronExpression.nextRuns`
- `Hatchet.createCron`, `Hatchet.getCron`, `Hatchet.listCrons`, `Hatchet.deleteCron`
- typed models and errors from the package root

Applications do not need a separate runtime service, Promise bridge, worker registration API, or lifecycle API.

## In-memory testing

Import the testing Layer from the package's testing subpath and exercise the same `Hatchet` operations used in production:

```ts
import { Hatchet } from "@effectify/hatchet"
import { layerInMemory } from "@effectify/hatchet/testing"
import * as Effect from "effect/Effect"

const local = Effect.gen(function*() {
  return yield* Hatchet.run(greet, { name: "Ada" })
}).pipe(Effect.provide(layerInMemory))
```

`@effectify/hatchet/testing` exports only `layerInMemory`, which is the same Layer as `Hatchet.layerInMemory`. It is process-local, scope-bound, non-durable, and non-distributed. Schedule and cron records exist for deterministic tests; they do not model a distributed Hatchet server.

## Migrate to 0.1

| Legacy alpha surface                                                                 | 0.1 replacement                                                                         |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `workflow`, standalone `task`                                                        | `Task.make` or `Task.durable`                                                           |
| `registerWorkflow`, `registerWorkflowWithConfig`                                     | Declare tasks in `Hatchet.layer({ tasks })`                                             |
| `Hatchet.register`, `Hatchet.startWorker`, `HatchetRuntime`                          | Let the scoped `Hatchet.layer` own registration and worker lifecycle                    |
| `clients/*`, `core/*`, `logging/*`, `schema/*` deep imports                          | Import supported tasks, operations, models, and errors from `@effectify/hatchet`        |
| Testing mocks such as `createMockHatchetClient`, `createMockContext`, and `testTask` | Provide `layerInMemory` from `@effectify/hatchet/testing` and call `Hatchet` operations |

The removed surfaces have no compatibility aliases.
