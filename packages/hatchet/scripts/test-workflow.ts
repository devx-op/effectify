/**
 * Example: dispatch without waiting, do independent Effect work, then await.
 *
 * Usage: configure HATCHET_CLIENT_TOKEN and run
 * `node --experimental-strip-types packages/hatchet/scripts/test-workflow.ts`.
 */

import { Hatchet, Task } from "@effectify/hatchet"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

const greeting = Task.make({
  name: "my-effect-task",
  input: Schema.Struct({ message: Schema.String }),
  output: Schema.Struct({ result: Schema.String, message: Schema.String }),
  fn: ({ message }) => Effect.succeed({ result: "done", message }),
})

const program = Effect.gen(function* () {
  const handle = yield* Hatchet.runNoWait(greeting, {
    message: "Hello from Effect",
  })
  yield* Effect.log("Hatchet task dispatched", { runId: handle.id })
  yield* Effect.log("Independent Effect work completed")
  const output = yield* handle.await
  yield* Effect.log("Hatchet task completed", output)
}).pipe(Effect.provide(Hatchet.layer({ tasks: [greeting] })))

const terminateAfterFinalizers = (exitCode: number): never => {
  // Hatchet SDK 1.21 has no public close/dispose API for its run-result gRPC
  // listener. Effect.runPromise settles only after Layer finalizers have completed,
  // so forced termination is intentionally limited to this executable CLI example.
  process.exit(exitCode)
}

Effect.runPromise(program).then(
  () => terminateAfterFinalizers(0),
  (error) => {
    console.error(error)
    return terminateAfterFinalizers(1)
  },
)
