import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { TodoEvent, TodoId, type Todo, type TodoEvent as Event, TodoAlreadyCompleted, TodoIdExhausted, TodoNotFound, TodoPersistenceError, TodoTextInvalid } from "@effectify/todo-domain"

export interface TodoRepositoryApi {
  readonly find: (id: TodoId) => Effect.Effect<Todo | undefined, TodoPersistenceError>
  readonly list: () => Effect.Effect<ReadonlyArray<Todo>, TodoPersistenceError>
  readonly remove: (id: TodoId) => Effect.Effect<Todo, TodoPersistenceError>
  readonly save: (todo: Todo) => Effect.Effect<void, TodoPersistenceError>
}
export class TodoRepository extends Context.Service<TodoRepository, TodoRepositoryApi>()("@effectify/todo/TodoRepository") {}

export class TodoClock extends Context.Service<TodoClock, { readonly now: () => Effect.Effect<string> }>()("@effectify/todo/TodoClock") {}
export class TodoIdGenerator extends Context.Service<TodoIdGenerator, { readonly next: () => Effect.Effect<TodoId, TodoIdExhausted> }>()("@effectify/todo/TodoIdGenerator") {}
export class TodoEvents extends Context.Service<TodoEvents, { readonly publish: (event: Event) => Effect.Effect<void> }>()("@effectify/todo/TodoEvents") {}

type TodoFailure = TodoAlreadyCompleted | TodoIdExhausted | TodoNotFound | TodoPersistenceError | TodoTextInvalid

export interface TodoApplicationApi {
  readonly add: (text: string) => Effect.Effect<Todo, TodoFailure>
  readonly complete: (id: string) => Effect.Effect<Todo, TodoFailure>
  readonly list: () => Effect.Effect<ReadonlyArray<Todo>, TodoPersistenceError>
  readonly remove: (id: string) => Effect.Effect<Todo, TodoFailure>
}
export class TodoApplication extends Context.Service<TodoApplication, TodoApplicationApi>()("@effectify/todo/TodoApplication") {}

const resolveId = (id: string): Effect.Effect<TodoId, TodoNotFound> =>
  Schema.decodeUnknownEffect(TodoId)(id).pipe(Effect.mapError(() => new TodoNotFound({ id })))

export const layer = Layer.effect(TodoApplication, Effect.gen(function* () {
  const repository = yield* TodoRepository
  const clock = yield* TodoClock
  const ids = yield* TodoIdGenerator
  const events = yield* TodoEvents
  const find = Effect.fn("TodoApplication.find")(function* (rawId: string) {
    const id = yield* resolveId(rawId)
    const todo = Option.fromUndefinedOr(yield* repository.find(id))
    if (Option.isNone(todo)) return yield* Effect.fail(new TodoNotFound({ id: rawId }))
    return todo.value
  })
  const add = Effect.fn("TodoApplication.add")(function* (text: string) {
    const normalized = text.trim()
    if (normalized.length === 0) return yield* Effect.fail(new TodoTextInvalid({ reason: "empty" }))
    const todo: Todo = { completed: false, createdAt: yield* clock.now(), id: yield* ids.next(), text: normalized }
    yield* repository.save(todo)
    yield* events.publish(TodoEvent.TodoAdded({ todo }))
    return todo
  })
  const complete = Effect.fn("TodoApplication.complete")(function* (id: string) {
    const todo = yield* find(id)
    if (todo.completed) return yield* Effect.fail(new TodoAlreadyCompleted({ id }))
    const completed = { ...todo, completed: true }
    yield* repository.save(completed)
    yield* events.publish(TodoEvent.TodoCompleted({ todo: completed }))
    return completed
  })
  const remove = Effect.fn("TodoApplication.remove")(function* (id: string) {
    const todo = yield* find(id)
    yield* repository.remove(todo.id)
    yield* events.publish(TodoEvent.TodoRemoved({ todo }))
    return todo
  })
  return TodoApplication.of({ add, complete, list: repository.list, remove })
}))
