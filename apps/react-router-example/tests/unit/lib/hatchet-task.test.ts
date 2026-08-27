import { greetingInput, greetingTask } from "../../../app/lib/hatchet/greeting-task.server.js"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"

describe("durable greeting task", () => {
  it("defines a stable task name and object input schema", async () => {
    expect(greetingTask.name).toBe("react-router-durable-greeting")
    await expect(Schema.decodeUnknownPromise(greetingInput)({ name: "Ada" })).resolves.toEqual({ name: "Ada" })
    await expect(Schema.decodeUnknownPromise(greetingInput)("Ada")).rejects.toBeInstanceOf(Error)
    await expect(Schema.decodeUnknownPromise(greetingInput)({ name: "" })).rejects.toBeInstanceOf(Error)
  })

  it("returns a transportable object from the task body", async () => {
    await expect(
      Effect.runPromise(
        greetingTask.execute(
          { name: "Grace" },
          {
            workflowRunId: { _tag: "None" },
            taskRunExternalId: { _tag: "None" },
            interruption: Effect.never,
          },
        ),
      ),
    ).resolves.toEqual({ greeting: "Hello, Grace!" })
  })
})
