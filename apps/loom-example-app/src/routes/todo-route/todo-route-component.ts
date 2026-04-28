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
        ${View.of(TodoHero)}
        <div class="todo-top-row">
          ${View.of(TodoInsights)}
          ${View.of(TodoComposer)}
        </div>
        ${View.of(TodoList)}
        ${View.of(TodoNotes)}
      `,
      )
    }
    `
  ),
)
