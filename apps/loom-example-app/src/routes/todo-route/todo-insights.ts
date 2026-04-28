import { Component, html, View } from "@effectify/loom"
import { todoActionStatusAtom, todoFeedbackAtom, todoItemsAtom } from "../todo-route-state.js"
import { completedTodoCount, remainingTodoCount, TodoPanel } from "./todo-route-shared.js"

export const TodoInsights = Component.make("TodoInsights").pipe(
  Component.state({
    actionStatus: todoActionStatusAtom,
    feedback: todoFeedbackAtom,
    todos: todoItemsAtom,
  }),
  Component.view(({ state }) =>
    View.use(
      TodoPanel,
      html`
      <h2 class="todo-section-title">Runtime snapshot</h2>
      <span class="todo-copy">
        The route loader owns the initial list, and every button funnels through the route action plus self-revalidation.
      </span>

      <div class="todo-stat-grid">
        <div class="todo-stat">
          <span class="todo-stat-label">Open</span>
          <span class="todo-stat-value" data-todo-open-count="true">${() =>
        `${remainingTodoCount(state.todos())}`}</span>
        </div>
        <div class="todo-stat">
          <span class="todo-stat-label">Completed</span>
          <span class="todo-stat-value" data-todo-completed-count="true">
            ${() => `${completedTodoCount(state.todos())}`}
          </span>
        </div>
        <div class="todo-stat">
          <span class="todo-stat-label">Action status</span>
          <span class="todo-stat-value" data-todo-action-status="true">${() => state.actionStatus()}</span>
        </div>
      </div>

      ${
        View.if(
          () => state.feedback() !== undefined,
          html`<span class="todo-copy" data-todo-feedback="true">${() => state.feedback() ?? ""}</span>`,
          html``,
        )
      }
    `,
    )
  ),
)
