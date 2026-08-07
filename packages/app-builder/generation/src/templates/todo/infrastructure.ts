export const infrastructureTemplate = String.raw`import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import { randomUUID } from "node:crypto"
import { dirname } from "node:path"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PubSub from "effect/PubSub"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import * as Schema from "effect/Schema"
import * as Application from "../../application/src/index.js"
import { Todo, TodoId, TodoIdExhausted, TodoPersistenceError, type Todo as TodoModel, type TodoEvent as Event } from "../../domain/src/index.js"

export interface TodoTestProbeApi { readonly events: () => Effect.Effect<ReadonlyArray<Event>> }
export class TodoTestProbe extends Context.Service<TodoTestProbe, TodoTestProbeApi>()("@effectify/todo/TodoTestProbe") {}

const decodeTodos = Schema.decodeUnknownEffect(Schema.Array(Todo))
const events = Effect.gen(function* () {
  const visible = yield* Ref.make<ReadonlyArray<Event>>([])
  const published = yield* PubSub.unbounded<Event>()
  return {
    probe: TodoTestProbe.of({ events: () => Ref.get(visible) }),
    service: Application.TodoEvents.of({
      publish: (event) => Ref.update(visible, (current) => [...current, event]).pipe(
        Effect.andThen(PubSub.publish(published, event)),
        Effect.asVoid,
      ),
    }),
    stream: Stream.fromPubSub(published),
  }
})

const repository = (read: () => Effect.Effect<ReadonlyArray<TodoModel>, TodoPersistenceError>, write: (todos: ReadonlyArray<TodoModel>) => Effect.Effect<void, TodoPersistenceError>) =>
  Application.TodoRepository.of({
    find: (id) => read().pipe(Effect.map((todos) => todos.find((todo) => todo.id === id))),
    list: read,
    remove: (id) => Effect.gen(function* () {
      const todos = yield* read()
      const todo = todos.find((candidate) => candidate.id === id)
      if (todo === undefined) return yield* Effect.fail(new TodoPersistenceError({ operation: "write" }))
      yield* write(todos.filter((candidate) => candidate.id !== id))
      return todo
    }),
    save: (todo) => read().pipe(
      Effect.flatMap((todos) => write([...todos.filter((candidate) => candidate.id !== todo.id), todo])),
    ),
  })

const fixedIds = (ids: ReadonlyArray<string>) => Effect.gen(function* () {
  const remaining = yield* Ref.make(ids)
  return Application.TodoIdGenerator.of({ next: () => Effect.gen(function* () {
    const [next, ...rest] = yield* Ref.get(remaining)
    if (next === undefined) return yield* Effect.fail(new TodoIdExhausted())
    yield* Ref.set(remaining, rest)
    return yield* Schema.decodeUnknownEffect(TodoId)(next).pipe(Effect.mapError(() => new TodoIdExhausted()))
  }) })
})

export const testLayer = (input: { readonly ids: ReadonlyArray<string>; readonly now: string }) => Layer.effectContext(Effect.gen(function* () {
  const todos = yield* Ref.make<ReadonlyArray<TodoModel>>([])
  const eventServices = yield* events
  return Context.empty().pipe(
    Context.add(Application.TodoRepository, repository(() => Ref.get(todos), (next) => Ref.set(todos, next))),
    Context.add(Application.TodoClock, Application.TodoClock.of({ now: () => Effect.succeed(input.now) })),
    Context.add(Application.TodoIdGenerator, yield* fixedIds(input.ids)),
    Context.add(Application.TodoEvents, eventServices.service),
    Context.add(TodoTestProbe, eventServices.probe),
  )
}))

export const liveLayer = (path: string) => Layer.effectContext(Effect.gen(function* () {
  yield* Effect.tryPromise({ try: () => mkdir(dirname(path), { recursive: true }), catch: () => new TodoPersistenceError({ operation: "write" }) })
  const exists = yield* Effect.promise(() => access(path).then(() => true, () => false))
  if (!exists) yield* Effect.tryPromise({ try: () => writeFile(path, "[]\n"), catch: () => new TodoPersistenceError({ operation: "write" }) })
  const read = () => Effect.tryPromise({ try: () => readFile(path, "utf8"), catch: () => new TodoPersistenceError({ operation: "read" }) }).pipe(
    Effect.flatMap((source) => Effect.try({ try: () => JSON.parse(source), catch: () => new TodoPersistenceError({ operation: "read" }) })),
    Effect.flatMap(decodeTodos),
    Effect.mapError(() => new TodoPersistenceError({ operation: "read" })),
  )
  const write = (todos: ReadonlyArray<TodoModel>) => Effect.tryPromise({
    try: () => writeFile(path, JSON.stringify(todos, null, 2) + "\n"),
    catch: () => new TodoPersistenceError({ operation: "write" }),
  })
  const eventServices = yield* events
  return Context.empty().pipe(
    Context.add(Application.TodoRepository, repository(read, write)),
    Context.add(Application.TodoClock, Application.TodoClock.of({ now: () => Effect.sync(() => new Date().toISOString()) })),
    Context.add(Application.TodoIdGenerator, Application.TodoIdGenerator.of({ next: () => Schema.decodeUnknownEffect(TodoId)(randomUUID()).pipe(Effect.mapError(() => new TodoIdExhausted())) })),
    Context.add(Application.TodoEvents, eventServices.service),
  )
}))
`
