import { Component, html, View } from "@effectify/loom"
import { TodoComposer } from "./todo-composer.js"
import { TodoHero } from "./todo-hero.js"
import { TodoInsights } from "./todo-insights.js"
import { TodoList } from "./todo-list.js"
import { TodoNotes, TodoPageShell } from "./todo-route-shared.js"

export const TodoRoute = Component.make("TodoRoute").pipe(
  Component.view(() =>
    html`
      ${
      View.use(
        TodoPageShell,
        html`
        ${View.use(TodoHero)}
        <div class="todo-top-row">
          ${View.use(TodoInsights)}
          ${View.use(TodoComposer)}
        </div>
        ${View.use(TodoList)}
        ${View.use(TodoNotes)}
      `,
      )
    }
    `
  ),
)
