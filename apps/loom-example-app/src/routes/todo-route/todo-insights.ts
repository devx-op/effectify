import { Component, View, Web } from "@effectify/loom"
import { todoActionStatusAtom, todoFeedbackAtom, todoItemsAtom } from "../todo-route-state.js"
import { completedTodoCount, remainingTodoCount, TodoPanel } from "./todo-route-shared.js"

export const TodoInsights = Component.make("TodoInsights").pipe(
  Component.state({
    actionStatus: todoActionStatusAtom,
    feedback: todoFeedbackAtom,
    todos: todoItemsAtom,
  }),
  Component.view(({ state }) =>
    Component.use(TodoPanel, [
      View.text("Runtime snapshot").pipe(Web.as("h2"), Web.className("todo-section-title")),
      View.text(
        "The route loader owns the initial list, and every button funnels through the route action plus self-revalidation.",
      ).pipe(Web.className("todo-copy")),
      View.hstack(
        View.vstack(
          View.text("Open").pipe(Web.className("todo-stat-label")),
          View.text(() => `${remainingTodoCount(state.todos())}`).pipe(
            Web.className("todo-stat-value"),
            Web.data("todo-open-count", "true"),
          ),
        ).pipe(Web.className("todo-stat")),
        View.vstack(
          View.text("Completed").pipe(Web.className("todo-stat-label")),
          View.text(() => `${completedTodoCount(state.todos())}`).pipe(
            Web.className("todo-stat-value"),
            Web.data("todo-completed-count", "true"),
          ),
        ).pipe(Web.className("todo-stat")),
        View.vstack(
          View.text("Action status").pipe(Web.className("todo-stat-label")),
          View.text(() => state.actionStatus()).pipe(
            Web.className("todo-stat-value"),
            Web.data("todo-action-status", "true"),
          ),
        ).pipe(Web.className("todo-stat")),
      ).pipe(Web.className("todo-stat-grid")),
      View.if(
        () => state.feedback() !== undefined,
        View.text(() => state.feedback() ?? "").pipe(
          Web.className("todo-copy"),
          Web.data("todo-feedback", "true"),
        ),
        View.fragment(),
      ),
    ])
  ),
)
