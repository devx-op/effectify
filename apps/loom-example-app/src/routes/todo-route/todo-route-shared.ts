import * as Schema from "effect/Schema"
import { Component, View, Web } from "@effectify/loom"
import { type TodoItem, TodoNotFoundError, type TodoServiceApi } from "../../todo-service.js"

export type TodoRouteServices = Readonly<{
  todoService: TodoServiceApi
}>

const TodoIntentSchema = Schema.Union([
  Schema.Literal("create"),
  Schema.Literal("toggle"),
  Schema.Literal("remove"),
  Schema.Literal("clear-completed"),
])

const TodoIdSchema = Schema.NumberFromString.check(Schema.isInt())

const TodoTitleSchema = Schema.Trim.check(Schema.isNonEmpty())

export const TodoItemSchema = Schema.Struct({
  completed: Schema.Boolean,
  id: Schema.Number,
  title: Schema.String,
})

export const TodoItemsSchema = Schema.Array(TodoItemSchema)

export const TodoCommandSchema = Schema.Union([
  Schema.Struct({ intent: Schema.Literal("create"), title: TodoTitleSchema }),
  Schema.Struct({ id: TodoIdSchema, intent: Schema.Literal("toggle") }),
  Schema.Struct({ id: TodoIdSchema, intent: Schema.Literal("remove") }),
  Schema.Struct({ intent: Schema.Literal("clear-completed") }),
])

export const TodoCommandResultSchema = Schema.Struct({
  intent: TodoIntentSchema,
})

export const TodoRouteErrorSchema = Schema.instanceOf(TodoNotFoundError)

export const remainingTodoCount = (todos: ReadonlyArray<TodoItem>): number =>
  todos.filter((todo) => !todo.completed).length

export const completedTodoCount = (todos: ReadonlyArray<TodoItem>): number =>
  todos.filter((todo) => todo.completed).length

export const hasCompletedTodos = (todos: ReadonlyArray<TodoItem>): boolean => todos.some((todo) => todo.completed)

export const TodoPanel = Component.make("TodoPanel").pipe(
  Component.view(({ children }) => View.vstack(children).pipe(Web.className("loom-example-card todo-panel"))),
)

export const TodoNotes = Component.make("TodoNotes").pipe(
  Component.view(() =>
    View.vstack(
      View.text(
        "View.input() + Web.value() still cover the composer, but the durable todo state now comes from loader/action runtime boundaries.",
      ).pipe(Web.className("compat-seam-note"), Web.data("todo-dx-caveat", "true")),
      View.text(
        "The point of this example is architecture: Effect-backed service first, Loom route runtime second, and UI atoms as the projected view state.",
      ).pipe(Web.className("dev-mode-note")),
    ).pipe(Web.className("loom-example-note-stack"))
  ),
)

export const TodoPageShell = Component.make("TodoPageShell").pipe(
  Component.view(({ children }) =>
    View.vstack(children).pipe(Web.className("loom-example-layout"), Web.data("route-view", "todo"))
  ),
)
