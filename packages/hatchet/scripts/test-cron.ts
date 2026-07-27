import { CronExpression, Hatchet, Task } from "@effectify/hatchet"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
const greeting = Task.make({
  name: "cron-greeting",
  input: Schema.Struct({ name: Schema.NonEmptyString }),
  fn: ({ name }) => Effect.log(`Hello, ${name}!`),
})
const program = Effect.gen(function*() {
  const schedule = yield* CronExpression.parse("0 9 * * *")
  const cron = yield* Hatchet.createCron(greeting, {
    name: "daily-greeting",
    schedule,
    input: { name: "Ada" },
  })
  yield* Effect.log("Cron state", (yield* Hatchet.getCron(cron.id))._tag)
  yield* Hatchet.listCrons({ taskName: greeting.name, name: cron.name })
  yield* Effect.log("Cron deleted", yield* Hatchet.deleteCron(cron.id))
  yield* Effect.log("Cron deleted again", yield* Hatchet.deleteCron(cron.id))
}).pipe(Effect.provide(Hatchet.layer({ tasks: [greeting] })))

Effect.runPromise(program).then(
  () => process.exit(0),
  (error) => {
    console.error(error)
    process.exit(1)
  },
)
