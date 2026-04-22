import { Component, View, Web } from "@effectify/loom"
import { counterRoutePath } from "../counter-route.js"
import { todoDraftAtom, todoItemsAtom, todoLoaderStatusAtom } from "../todo-route-state.js"

export const TodoHero = Component.make("TodoHero").pipe(
  Component.state({
    draft: todoDraftAtom,
    todos: todoItemsAtom,
    loaderStatus: todoLoaderStatusAtom,
  }),
  Component.view(({ state }) =>
    View.vstack(
      View.vstack(
        View.text("Example app only").pipe(Web.className("loom-example-eyebrow")),
        View.text("Loom vNext todo app").pipe(Web.as("h1"), Web.className("todo-title")),
        View.text(
          "This route now reads through a loader and writes through an action runtime so the example shows an honest data flow instead of mutating module state directly.",
        ).pipe(Web.className("todo-copy")),
      ).pipe(Web.className("loom-example-hero")),
      View.hstack(
        View.vstack(
          View.text("Loaded todos").pipe(Web.className("todo-kpi-label")),
          View.text(() => `${state.todos().length} tracked todos`).pipe(Web.className("todo-kpi-value")),
        ).pipe(Web.className("todo-kpi")),
        View.vstack(
          View.text("Loader status").pipe(Web.className("todo-kpi-label")),
          View.text(() => state.loaderStatus()).pipe(
            Web.className("todo-kpi-value"),
            Web.data("todo-runtime-status", "true"),
          ),
        ).pipe(Web.className("todo-kpi")),
        View.vstack(
          View.text("Draft sync").pipe(Web.className("todo-kpi-label")),
          View.text(() => state.draft().trim().length > 0 ? "Composer is holding input" : "Composer is empty").pipe(
            Web.className("todo-kpi-value"),
          ),
        ).pipe(Web.className("todo-kpi")),
        View.link("Back to counter", counterRoutePath).pipe(Web.className("outline secondary todo-link")),
      ).pipe(Web.className("todo-kpi-row")),
    ).pipe(Web.data("todo-hero", "true"))
  ),
)
