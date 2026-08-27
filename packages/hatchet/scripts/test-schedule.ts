import { Hatchet, Task } from "@effectify/hatchet"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

const greeting = Task.make({
  name: "scheduled-greeting",
  input: Schema.Struct({ name: Schema.NonEmptyString }),
  fn: ({ name }) => Effect.log(`Hello, ${name}!`),
})

const program = Effect.gen(function* () {
  const schedule = yield* Hatchet.schedule(greeting, { name: "Ada" }, { _tag: "After", delay: "5 seconds" })
  yield* Effect.log("Schedule created", {
    id: schedule.id,
    triggerAt: schedule.triggerAt.toISOString(),
  })
  const pending = yield* Hatchet.getSchedule(schedule.id)
  yield* Effect.log("Schedule state", pending._tag)
  yield* Effect.log("Schedule deleted", yield* Hatchet.deleteSchedule(schedule.id))
  yield* Effect.log("Schedule deleted again", yield* Hatchet.deleteSchedule(schedule.id))
}).pipe(Effect.provide(Hatchet.layer({ tasks: [greeting] })))

// The Promise settles after Layer finalizers. Hatchet SDK 1.21 can retain its
// gRPC listener, so forced termination is limited to this executable example.
Effect.runPromise(program).then(
  () => process.exit(0),
  (error) => {
    console.error(error)
    process.exit(1)
  },
)
