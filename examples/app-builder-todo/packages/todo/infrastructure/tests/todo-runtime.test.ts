import { expect, it } from "@effect/vitest"
import * as Application from "@effectify/todo-application"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { TodoTestProbe, testLayer } from "../src/index.js"

it.effect("publishes ordered Test Layer events after writes", () => Effect.gen(function* () {
  const layer = Application.layer.pipe(Layer.provideMerge(testLayer({ ids: ["todo-1"], now: "2026-01-01T00:00:00.000Z" })))
  const services = yield* Effect.all({ app: Application.TodoApplication, probe: TodoTestProbe }).pipe(Effect.provide(layer))
  const added = yield* services.app.add("write tests")
  yield* services.app.complete(added.id)
  expect(yield* services.probe.events()).toEqual([{ _tag: "TodoAdded", todo: added }, { _tag: "TodoCompleted", todo: { ...added, completed: true } }])
}))
