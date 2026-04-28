import { Component, html } from "@effectify/loom"
import { counterRoutePath } from "../counter-route.js"
import { todoDraftAtom, todoItemsAtom, todoLoaderStatusAtom } from "../todo-route-state.js"

export const TodoHero = Component.make("TodoHero").pipe(
  Component.state({
    draft: todoDraftAtom,
    todos: todoItemsAtom,
    loaderStatus: todoLoaderStatusAtom,
  }),
  Component.view(({ state }) =>
    html`
      <div data-todo-hero="true">
        <div class="loom-example-hero">
          <span class="loom-example-eyebrow">Example app only</span>
          <h1 class="todo-title">Loom vNext todo app</h1>
          <span class="todo-copy">
            This route now reads through a loader and writes through an action runtime, while the UI is authored with Loom templates and View.use composition.
          </span>
        </div>

        <div class="todo-kpi-row">
          <div class="todo-kpi">
            <span class="todo-kpi-label">Loaded todos</span>
            <span class="todo-kpi-value">${() => `${state.todos().length} tracked todos`}</span>
          </div>
          <div class="todo-kpi">
            <span class="todo-kpi-label">Loader status</span>
            <span class="todo-kpi-value" data-todo-runtime-status="true">${() => state.loaderStatus()}</span>
          </div>
          <div class="todo-kpi">
            <span class="todo-kpi-label">Draft sync</span>
            <span class="todo-kpi-value">
              ${() => state.draft().trim().length > 0 ? "Composer is holding input" : "Composer is empty"}
            </span>
          </div>
          <a href=${counterRoutePath} class="outline secondary todo-link">Back to counter</a>
        </div>
      </div>
    `
  ),
)
