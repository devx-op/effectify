/**
 * Example: run a task-first Hatchet worker.
 *
 * Usage: set HATCHET_TOKEN, then run `pnpm tsx packages/hatchet/scripts/test-workflow.ts`.
 */

import * as Effect from "effect/Effect"
import { Hatchet, Task } from "@effectify/hatchet"

const token = process.env.HATCHET_TOKEN
if (!token) {
  console.error("Please set HATCHET_TOKEN")
  process.exit(1)
}

const greeting = Task.make({
  name: "my-effect-task",
  fn: (input: { readonly message: string }) => Effect.sync(() => ({ result: "done", message: input.message })),
})

const program = Effect.scoped(
  Effect.gen(function*() {
    const registered = yield* Hatchet.register(greeting)
    yield* Hatchet.startWorker
    const schedule = yield* Hatchet.schedule(
      registered,
      { message: "Hello" },
      {
        _tag: "After",
        delay: "1 minute",
      },
    )

    console.log(
      `Worker ready; scheduled ${schedule.id}. Waiting for interruption.`,
    )
    yield* Effect.never
  }).pipe(
    Effect.provide(
      Hatchet.layer({
        worker: { name: "my-worker" },
        client: { token, hostPort: "localhost:7077" },
      }),
    ),
  ),
)

Effect.runPromise(program).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
