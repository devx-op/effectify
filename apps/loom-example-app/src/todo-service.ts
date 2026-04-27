import * as Data from "effect/Data"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"

export interface TodoItem {
  readonly id: number
  readonly title: string
  readonly completed: boolean
}

export type TodoCommand =
  | { readonly intent: "create"; readonly title: string }
  | { readonly intent: "toggle"; readonly id: number }
  | { readonly intent: "remove"; readonly id: number }
  | { readonly intent: "clear-completed" }

export type TodoCommandResult = Readonly<{
  intent: TodoCommand["intent"]
}>

export class TodoNotFoundError extends Data.TaggedError("TodoNotFoundError")<{
  readonly id: number
}> {}

export interface TodoServiceApi {
  readonly list: () => Effect.Effect<ReadonlyArray<TodoItem>>
  readonly dispatch: (command: TodoCommand) => Effect.Effect<TodoCommandResult, TodoNotFoundError>
  readonly reset: () => Effect.Effect<void>
}

export const initialTodoItems: ReadonlyArray<TodoItem> = [
  { id: 1, title: "Sketch the shared Atom shape", completed: true },
  { id: 2, title: "Wire the composer to shared state", completed: false },
  { id: 3, title: "Show composition through child components", completed: false },
]

export const cloneInitialTodos = (): Array<TodoItem> => initialTodoItems.map((todo) => ({ ...todo }))

export class TodoService extends Context.Service<TodoService>()("LoomExampleTodoService", {
  make: Effect.gen(function*() {
    const todosRef = yield* Ref.make(cloneInitialTodos())
    const nextIdRef = yield* Ref.make(initialTodoItems.length + 1)

    return {
      list: () => Ref.get(todosRef),
      dispatch: (command: TodoCommand) =>
        Effect.gen(function*() {
          switch (command.intent) {
            case "create": {
              const nextId = yield* Ref.get(nextIdRef)
              const nextTodo: TodoItem = {
                id: nextId,
                title: command.title,
                completed: false,
              }

              yield* Ref.update(todosRef, (current) => [...current, nextTodo])
              yield* Ref.set(nextIdRef, nextId + 1)

              return { intent: command.intent } satisfies TodoCommandResult
            }
            case "toggle": {
              const current = yield* Ref.get(todosRef)

              if (!current.some((todo) => todo.id === command.id)) {
                return yield* Effect.fail(new TodoNotFoundError({ id: command.id }))
              }

              yield* Ref.update(todosRef, (todos) =>
                todos.map((todo) => todo.id === command.id ? { ...todo, completed: !todo.completed } : todo))

              return { intent: command.intent } satisfies TodoCommandResult
            }
            case "remove": {
              const current = yield* Ref.get(todosRef)

              if (
                !current.some((todo) =>
                  todo.id === command.id
                )
              ) {
                return yield* Effect.fail(new TodoNotFoundError({ id: command.id }))
              }

              yield* Ref.update(todosRef, (todos) => todos.filter((todo) => todo.id !== command.id))

              return { intent: command.intent } satisfies TodoCommandResult
            }
            case "clear-completed": {
              yield* Ref.update(todosRef, (todos) => todos.filter((todo) => !todo.completed))

              return { intent: command.intent } satisfies TodoCommandResult
            }
          }
        }),
      reset: () =>
        Effect.gen(function*() {
          yield* Ref.set(todosRef, cloneInitialTodos())
          yield* Ref.set(nextIdRef, initialTodoItems.length + 1)
        }),
    } satisfies TodoServiceApi
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}

export const makeTodoService = (): TodoServiceApi => Effect.runSync(TodoService.make)
