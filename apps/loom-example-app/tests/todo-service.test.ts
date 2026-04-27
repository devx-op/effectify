import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"
import { makeTodoService, TodoService } from "../src/todo-service.js"

describe("loom example todo service", () => {
  it("creates and resets todos through the Context.Service runtime", async () => {
    const service = makeTodoService()

    await Effect.runPromise(service.dispatch({ intent: "create", title: "Verify Context.Service migration" }))

    expect(await Effect.runPromise(service.list())).toEqual([
      { completed: true, id: 1, title: "Sketch the shared Atom shape" },
      { completed: false, id: 2, title: "Wire the composer to shared state" },
      { completed: false, id: 3, title: "Show composition through child components" },
      { completed: false, id: 4, title: "Verify Context.Service migration" },
    ])

    await Effect.runPromise(service.reset())

    expect(await Effect.runPromise(service.list())).toEqual([
      { completed: true, id: 1, title: "Sketch the shared Atom shape" },
      { completed: false, id: 2, title: "Wire the composer to shared state" },
      { completed: false, id: 3, title: "Show composition through child components" },
    ])
  })

  it("fails with TodoNotFoundError for unknown ids", async () => {
    await expect(
      Effect.runPromise(
        Effect.gen(function*() {
          const service = yield* TodoService
          return yield* service.dispatch({ id: 99, intent: "remove" })
        }).pipe(Effect.provide(TodoService.layer)),
      ),
    ).rejects.toMatchObject({ _tag: "TodoNotFoundError", id: 99 })
  })
})
