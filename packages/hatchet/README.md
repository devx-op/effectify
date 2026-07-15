# @effectify/hatchet

## Breaking alpha migration

The workflow DSL (`workflow`, `task`, `registerWorkflow`, and
`registerWorkflowWithConfig`) has been removed. Define work with `Task.make`,
register it through `Hatchet`, and execute it with the scoped in-memory layer.

```ts
const task = Task.make({ name: "greet", fn: (name: string) => Effect.succeed(`Hello ${name}`) })
const program = Effect.gen(function*() {
  const registered = yield* Hatchet.register(task)
  return yield* Hatchet.run(registered, "Ada")
}).pipe(Effect.provide(Hatchet.layerInMemory))
```

The in-memory layer is deterministic and scope-aware. It does not model a live
Hatchet worker, scheduling, cron, durability, remote execution, or dashboard
logging; those capabilities are intentionally outside this PR 1 boundary.
