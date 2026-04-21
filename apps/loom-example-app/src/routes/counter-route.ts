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
    View.vstack(
      View.vstack(
        View.vstack(View.text("Example app only")).pipe(Web.className("loom-example-eyebrow")),
        View.vstack(View.text("Loom vNext counter")).pipe(
          Web.className("counter-title"),
          Web.attr("role", "heading"),
          Web.aria("level", 1),
        ),
        View.vstack(
          View.text(
            "This example keeps a single route and teaches the current Loom happy path first: Component.model/actions/view with View + Web modifiers.",
          ),
        ).pipe(Web.className("counter-copy")),
      ).pipe(Web.className("loom-example-hero")),
      View.vstack(
        View.vstack(
          View.text("Counter state").pipe(Web.className("counter-value-label")),
          View.hstack(
            View.text("Count: ").pipe(Web.className("counter-value-prefix")),
            View.vstack(View.text(() => `${state.count()}`)).pipe(
              Web.className("counter-dynamic-value"),
              Web.data("counter-dynamic-value", "true"),
            ),
          ).pipe(Web.className("counter-value"), Web.data("counter-value", "true")),
        ).pipe(Web.className("counter-value-card")),
        View.hstack(
          View.button(View.fragment("-", 1), actions.decrement).pipe(
            Web.className("secondary"),
            Web.data("counter-action", "decrement"),
          ),
          View.button(View.fragment("+", 1), actions.increment).pipe(
            Web.className("contrast"),
            Web.data("counter-action", "increment"),
          ),
          View.button("Reset", actions.reset).pipe(
            Web.className("outline secondary"),
            Web.data("counter-action", "reset"),
          ),
        ).pipe(Web.className("counter-actions"), Web.data("counter-controls", "true")),
      ).pipe(Web.className("loom-example-card")),
      View.vstack(
        View.vstack(
          View.text(
            "Html stays at the document/resume boundary only, not in the main authoring path developers copy from this example.",
          ),
        ).pipe(Web.className("compat-seam-note"), Web.data("compat-seam-note", "true")),
        View.vstack(
          View.text(
            "Debug cue: only the numeric value flashes when the current text-node slice updates; the surrounding label stays static.",
          ),
        ).pipe(Web.className("counter-debug-note"), Web.data("counter-debug-note", "true")),
        View.vstack(
          View.text(
            "Dev caveat: in plain Vite dev the browser uses mount(...) to fill the empty root when no payload is present. That fallback is honest DX, not fake full SSR.",
          ),
        ).pipe(Web.className("dev-mode-note"), Web.data("dev-mode-note", "true")),
      ).pipe(Web.className("loom-example-note-stack")),
    ).pipe(Web.className("loom-example-layout"), Web.data("route-view", "counter"))
  ),
)

export const counterPageRoute = Route.make({
  identifier: counterRouteId,
  path: counterRoutePath,
  content: counterRoute,
})
