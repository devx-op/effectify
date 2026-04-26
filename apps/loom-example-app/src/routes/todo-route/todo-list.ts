import { Component, View, Web } from "@effectify/loom"
import { todoActionStatusAtom, todoItemsAtom } from "../todo-route-state.js"
import { submitTodoRouteSubmission } from "../todo-route-submission.js"
import { hasCompletedTodos, TodoPanel } from "./todo-route-shared.js"

export const TodoList = Component.make("TodoList").pipe(
  Component.state({
    actionStatus: todoActionStatusAtom,
    todos: todoItemsAtom,
  }),
  Component.actions(() => ({
    clearCompleted: async (): Promise<void> => {
      await submitTodoRouteSubmission({ intent: "clear-completed" })
    },
    removeTodo: async (id: number): Promise<void> => {
      await submitTodoRouteSubmission({ intent: "remove", id: String(id) })
    },
    toggleTodo: async (id: number): Promise<void> => {
      await submitTodoRouteSubmission({ intent: "toggle", id: String(id) })
    },
  })),
  Component.view(({ state, actions }) =>
    Component.use(TodoPanel, [
      View.hstack(
        View.vstack(
          View.text("Todo list").pipe(Web.as("h2"), Web.className("todo-section-title")),
          View.text(
            "Secondary buttons also dispatch through the same route action instead of mutating atoms in place.",
          ).pipe(
            Web.className("todo-copy"),
          ),
        ),
        View.button("Clear completed", () => actions.clearCompleted()).pipe(
          Web.className("outline secondary"),
          Web.attr("disabled", () => !hasCompletedTodos(state.todos()) || state.actionStatus() === "submitting"),
          Web.data("todo-clear-completed", "true"),
        ),
      ).pipe(Web.className("todo-list-header")),
      View.if(
        () => state.todos().length === 0,
        View.text("No todos left. Add another one from the composer above.").pipe(
          Web.className("todo-empty-state"),
          Web.data("todo-empty-state", "true"),
        ),
        View.vstack(
          View.for(() => state.todos(), {
            key: (todo) => todo.id,
            render: (todo) =>
              View.hstack(
                View.button(todo.completed ? "Re-open" : "Done", () => actions.toggleTodo(todo.id)).pipe(
                  Web.className(todo.completed ? "outline secondary" : "secondary"),
                  Web.attr("disabled", () => state.actionStatus() === "submitting"),
                  Web.data("todo-toggle-id", `${todo.id}`),
                ),
                View.vstack(
                  View.text(todo.title).pipe(
                    Web.className(todo.completed ? "todo-item-title todo-item-title--completed" : "todo-item-title"),
                  ),
                  View.text(todo.completed ? "Completed task" : "Open task").pipe(Web.className("todo-item-status")),
                ).pipe(Web.className("todo-item-copy")),
                View.button("Remove", () => actions.removeTodo(todo.id)).pipe(
                  Web.className("outline contrast"),
                  Web.attr("disabled", () => state.actionStatus() === "submitting"),
                  Web.data("todo-remove-id", `${todo.id}`),
                ),
              ).pipe(
                Web.as("li"),
                Web.className(todo.completed ? "todo-item todo-item--completed" : "todo-item"),
                Web.data("todo-item-id", `${todo.id}`),
              ),
          }),
        ).pipe(Web.as("ul"), Web.className("todo-item-list"), Web.data("todo-list", "true")),
      ),
    ])
  ),
)
