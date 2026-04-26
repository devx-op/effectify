import { Component, View, Web } from "@effectify/loom"
import { TodoComposer } from "./todo-composer.js"
import { TodoHero } from "./todo-hero.js"
import { TodoInsights } from "./todo-insights.js"
import { TodoList } from "./todo-list.js"
import { TodoNotes, TodoPageShell } from "./todo-route-shared.js"

export const TodoRoute = Component.make("TodoRoute").pipe(
  Component.view(() =>
    Component.use(TodoPageShell, [
      Component.use(TodoHero),
      View.hstack(
        Component.use(TodoInsights),
        Component.use(TodoComposer),
      ).pipe(Web.className("todo-top-row")),
      Component.use(TodoList),
      Component.use(TodoNotes),
    ])
  ),
)
