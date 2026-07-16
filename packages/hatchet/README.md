# @effectify/hatchet

`@effectify/hatchet` is now task-first: define work with `Task.make`, register it through the `Hatchet` service, and keep the chosen layer inside an Effect scope.

## Breaking alpha migration

The alpha workflow DSL is gone: `workflow`, standalone `task`, `registerWorkflow`, and `registerWorkflowWithConfig` are not exported. There is no compatibility facade or migration shim.

| Before                     | After                                                               |
| -------------------------- | ------------------------------------------------------------------- |
| `workflow(...).task(...)`  | `Task.make({ name, fn })`                                           |
| `registerWorkflow(...)`    | `Hatchet.register(task)` in a program provided with a Hatchet layer |
| SDK schedule/cron wrappers | `Hatchet.schedule`, cron CRUD, and `Hatchet.cancelRun`              |

## Quick path: deterministic local development

```ts
import * as Effect from "effect/Effect"
import { Hatchet, Task } from "@effectify/hatchet"

const greet = Task.make({
  name: "greet",
  fn: (name: string) => Effect.succeed(`Hello ${name}`),
})

const program = Effect.gen(function*() {
  const registered = yield* Hatchet.register(greet)
  return yield* Hatchet.run(registered, "Ada")
}).pipe(Effect.provide(Hatchet.layerInMemory))
```

Run scoped effects with `Effect.scoped(...)` when scheduling or using the live layer. The scope owns pending local timers, detached local runs, and live worker resources.

## Time capabilities

Register the task once, then use the registered capability. `At` schedules at a future `Date`; `After` uses an Effect `Duration.Input`.

```ts
const program = Effect.gen(function*() {
  const registered = yield* Hatchet.register(greet)

  const schedule = yield* Hatchet.schedule(registered, "Ada", {
    _tag: "After",
    delay: "5 minutes",
  })

  yield* Hatchet.schedule(registered, "Grace", {
    _tag: "At",
    at: new Date(Date.now() + 60_000),
  })

  return schedule.id
})
```

A schedule is a trigger, not a run. `deleteSchedule(id)` returns whether a pending trigger was removed. Once emitted, the trigger is gone; deleting it does not cancel the independent run.

### Storage-only cron

Cron on `Hatchet.layerInMemory` is deterministic storage only. It accepts shallow five-field expressions, supports create/get/list/delete, and **never fires a timer or a task**.

```ts
const cron = yield * Hatchet.createCron(registered, {
  name: "weekday-greeting",
  expression: "0 9 * * 1-5",
  input: { recipient: "Ada" },
})

const stored = yield * Hatchet.listCrons({ name: "weekday-greeting" })
yield * Hatchet.deleteCron(cron.id)
```

### Cancellation

Cancel an emitted or direct run by its `RunId`; cancellation is not deletion and never removes schedule or cron history.

```ts
const handle = yield * Hatchet.runNoWait(registered, "Ada")
yield * Hatchet.cancelRun(handle.id)
```

## Live layer

Use `Hatchet.layer` only inside a scope. The live adapter supports verified SDK 1.21.0 schedule create/get/delete, cron create/get/list/delete, and single-run cancellation (`runs.cancel({ ids: [runId] })`). SDK failures are `HatchetSdkError` values with `originalCause` retained.

```ts
const live = Effect.scoped(
  Effect.gen(function*() {
    const registered = yield* Hatchet.register(greet)
    yield* Hatchet.startWorker
    const schedule = yield* Hatchet.schedule(registered, "Ada", {
      _tag: "After",
      delay: "5 minutes",
    })

    console.log(`Scheduled ${schedule.id}; worker is active until interruption.`)
    return yield* Effect.never
  }).pipe(
    Effect.provide(Hatchet.layer({ worker: { name: "greeting-worker" } })),
  ),
)
```

## Fidelity and rollback limits

`Hatchet.layerInMemory` is process-local, scope-bound, non-durable, and non-distributed. It does not model remote execution, worker affinity, retries, dashboard state, persistence, or remote races. Its cron records never fire.

Closing an in-memory scope interrupts pending timers/runs and discards storage-only cron records. Code rollback does **not** roll back remote Hatchet registrations: inventory created remote schedule and cron IDs, explicitly delete pending triggers, and explicitly cancel emitted runs by run ID. Never perform automatic broad-filter or bulk cleanup.

The retained `core/client.ts`, `core/config.ts`, and `testing/mock-client.ts` support unrelated administrative internals. They are deferred from this task-first public API migration.
