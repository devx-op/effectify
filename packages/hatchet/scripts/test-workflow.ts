/**
 * Example: invoke a task through the package-owned Hatchet Layer.
 *
 * Usage: configure HATCHET_CLIENT_TOKEN and run
 * `pnpm tsx packages/hatchet/scripts/test-workflow.ts`.
 */

import { Hatchet, Task } from "@effectify/hatchet"
import * as Effect from "effect/Effect"

const greeting = Task.make({
  name: "my-effect-task",
  fn: (input: { readonly message: string }) => Effect.succeed({ result: "done", message: input.message }),
})

const program = Hatchet.run(greeting, { message: "Hello from Effect" }).pipe(
  Effect.tap((output) => Effect.log("Hatchet task completed", output)),
  Effect.provide(Hatchet.layer({ tasks: [greeting] })),
)

Effect.runPromise(program).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
