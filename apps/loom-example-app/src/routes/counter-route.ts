import { Atom } from "effect/unstable/reactivity"
import { Component, View, Web } from "@effectify/loom"
import { Route } from "@effectify/loom-router"
import { counterInitialCount } from "../app-config.js"

export const counterRouteId = "counter"
export const counterRoutePath = "/"
export const counterRouteTitle = "Counter"

export const counterRoute = Component.make("counter-route").pipe(
  Component.model({
    count: () => Atom.make(counterInitialCount).pipe(Atom.keepAlive),
  }),
  Component.actions({
    decrement: ({ count }) => count.update((value) => value - 1),
    increment: ({ count }) => count.update((value) => value + 1),
    reset: ({ count }) => count.set(counterInitialCount),
  }),
  Component.view(({ state, actions }) =>
    View.stack(
      View.stack(View.text("Loom vNext counter")).pipe(
        Web.className("counter-title"),
        Web.attr("role", "heading"),
        Web.aria("level", 1),
      ),
      View.stack(
        View.text(
          "This example keeps a single route and teaches the current Loom happy path first: Component.model/actions/view with View + Web modifiers.",
        ),
      ).pipe(Web.className("counter-copy")),
      View.stack(
        View.text(
          "Html stays at the document/resume boundary only, not in the main authoring path developers copy from this example.",
        ),
      ).pipe(Web.data("compat-seam-note", "true")),
      View.row(
        View.button("-1", actions.decrement).pipe(Web.data("counter-action", "decrement")),
        View.button("+1", actions.increment).pipe(Web.data("counter-action", "increment")),
        View.button("Reset", actions.reset).pipe(Web.data("counter-action", "reset")),
      ).pipe(
        Web.className("counter-actions"),
        Web.data("counter-controls", "true"),
        Web.style({ display: "flex", gap: "0.75rem", marginTop: "1rem" }),
      ),
      View.stack(View.text(`Count: ${state.count}`)).pipe(Web.data("counter-value", "true")),
      View.stack(
        View.text(
          "Dev caveat: in plain Vite dev the browser uses mount(...) to fill the empty root when no payload is present. That fallback is honest DX, not fake full SSR.",
        ),
      ).pipe(Web.data("dev-mode-note", "true")),
    ).pipe(Web.className("loom-example-counter"), Web.data("route-view", "counter"))
  ),
)

export const counterPageRoute = Route.make({
  identifier: counterRouteId,
  path: counterRoutePath,
  content: counterRoute,
})
