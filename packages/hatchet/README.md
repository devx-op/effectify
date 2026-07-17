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
- `Hatchet.layer({ tasks, options?, config? })` — package-owned lazy live Layer
- `Hatchet.layerInMemory` — deterministic scoped adapter for tests
- `Hatchet.run(task, input)` — await task output
- `Hatchet.runNoWait(task, input)` — obtain a run handle
- `Hatchet.schedule`, `Hatchet.getSchedule`, `Hatchet.deleteSchedule`
- `Hatchet.cancelRun`
- `Hatchet.createCron`, `Hatchet.getCron`, `Hatchet.listCrons`, `Hatchet.deleteCron`
- typed models and errors from the package root

Applications do not need a separate runtime service, Promise bridge, worker registration API, or lifecycle API.

## In-memory adapter

```ts
const local = Effect.gen(function*() {
  return yield* Hatchet.run(greet, { name: "Ada" })
}).pipe(Effect.provide(Hatchet.layerInMemory))
```

The in-memory adapter is process-local, scope-bound, non-durable, and non-distributed. Its schedule and cron records exist for deterministic tests; they do not model a distributed Hatchet server.
