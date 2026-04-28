import { Component, html, View } from "@effectify/loom"
import { todoActionStatusAtom, todoItemsAtom } from "../todo-route-state.js"
import { submitTodoRouteSubmission } from "../todo-route-submission.js"
import { hasCompletedTodos, TodoPanel } from "./todo-route-shared.js"
import { ensureTemplateDocument } from "../../template-dom-support.js"

ensureTemplateDocument()

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
    View.use(
      TodoPanel,
      html`
      <div class="todo-list-header">
        <div>
          <h2 class="todo-section-title">Todo list</h2>
          <span class="todo-copy">
            Secondary buttons also dispatch through the same route action instead of mutating atoms in place.
          </span>
        </div>

        <button
          type="button"
          class="outline secondary"
          data-todo-clear-completed="true"
          disabled=${() => !hasCompletedTodos(state.todos()) || state.actionStatus() === "submitting"}
          web:click=${() => actions.clearCompleted()}
        >
          Clear completed
        </button>
      </div>

      ${
        View.if(
          () => state.todos().length === 0,
          html`<span class="todo-empty-state" data-todo-empty-state="true">No todos left. Add another one from the composer above.</span>`,
          html`
          <ul class="todo-item-list" data-todo-list="true">
            ${
            View.for(() => state.todos(), {
              key: (todo) => todo.id,
              render: (todo) =>
                html`
                  <li class=${
                  todo.completed ? "todo-item todo-item--completed" : "todo-item"
                } data-todo-item-id=${`${todo.id}`}>
                    <button
                      type="button"
                      class=${todo.completed ? "outline secondary" : "secondary"}
                      data-todo-toggle-id=${`${todo.id}`}
                      disabled=${() => state.actionStatus() === "submitting"}
                      web:click=${() => actions.toggleTodo(todo.id)}
                    >
                      ${todo.completed ? "Re-open" : "Done"}
                    </button>

                    <div class="todo-item-copy">
                      <span class=${todo.completed ? "todo-item-title todo-item-title--completed" : "todo-item-title"}>
                        ${todo.title}
                      </span>
                      <span class="todo-item-status">${todo.completed ? "Completed task" : "Open task"}</span>
                    </div>

                    <button
                      type="button"
                      class="outline contrast"
                      data-todo-remove-id=${`${todo.id}`}
                      disabled=${() => state.actionStatus() === "submitting"}
                      web:click=${() => actions.removeTodo(todo.id)}
                    >
                      Remove
                    </button>
                  </li>
                `,
            })
          }
          </ul>
        `,
        )
      }
    `,
    )
  ),
)
