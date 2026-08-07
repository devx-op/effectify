export const cliTemplate = String.raw`import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Application from "../../../packages/todo/application/src/index.js"
import * as Infrastructure from "../../../packages/todo/infrastructure/src/index.js"
import type { TodoEvent } from "../../../packages/todo/domain/src/index.js"

export const createTestRuntime = (input: { readonly ids: ReadonlyArray<string>; readonly now: string }) => Effect.gen(function* () {
  const layer = Application.layer.pipe(Layer.provideMerge(Infrastructure.testLayer(input)))
  const services = yield* Effect.all({ application: Application.TodoApplication, probe: Infrastructure.TodoTestProbe }).pipe(Effect.provide(layer))
  return Object.freeze({ ...services.application, events: services.probe.events })
})

export const createLiveRuntime = (path: string) => Effect.gen(function* () {
  const layer = Application.layer.pipe(Layer.provide(Infrastructure.liveLayer(path)))
  return yield* Application.TodoApplication.pipe(Effect.provide(layer))
})

export const renderEvent = (event: TodoEvent): string =>
  event._tag === "TodoAdded" ? "added:" + event.todo.id + ":" + event.todo.text
  : event._tag === "TodoCompleted" ? "completed:" + event.todo.id + ":" + event.todo.text
  : "removed:" + event.todo.id + ":" + event.todo.text
`
