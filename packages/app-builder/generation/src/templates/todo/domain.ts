export const domainTemplate = String.raw`import * as Data from "effect/Data"
import * as Schema from "effect/Schema"

export const TodoId = Schema.NonEmptyString.pipe(Schema.brand("Effectify.TodoId"))
export type TodoId = typeof TodoId.Type

export const Todo = Schema.Struct({
  completed: Schema.Boolean,
  createdAt: Schema.String,
  id: TodoId,
  text: Schema.NonEmptyString,
})
export type Todo = typeof Todo.Type

export class TodoTextInvalid extends Data.TaggedError("TodoTextInvalid")<{ readonly reason: "empty" }> {}
export class TodoNotFound extends Data.TaggedError("TodoNotFound")<{ readonly id: string }> {}
export class TodoAlreadyCompleted extends Data.TaggedError("TodoAlreadyCompleted")<{ readonly id: string }> {}
export class TodoIdExhausted extends Data.TaggedError("TodoIdExhausted")<{}> {}
export class TodoPersistenceError extends Data.TaggedError("TodoPersistenceError")<{
  readonly operation: "read" | "write"
}> {}

export type TodoEvent = Data.TaggedEnum<{
  TodoAdded: { readonly todo: Todo }
  TodoCompleted: { readonly todo: Todo }
  TodoRemoved: { readonly todo: Todo }
}>
export const TodoEvent = Data.taggedEnum<TodoEvent>()
`
