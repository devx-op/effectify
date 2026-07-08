import { Atom } from "effect/unstable/reactivity"
import { Component, html, Web } from "@effectify/loom"

const counterInitialCount = 2

export const counterRouteId = "counter"
export const counterRoutePath = "/"
export const counterRouteTitle = "Counter"

const counterCueTone = (count: number): "baseline" | "rising" | "falling" => {
  if (count > counterInitialCount) {
    return "rising"
  }

  if (count < counterInitialCount) {
    return "falling"
  }

  return "baseline"
}

const counterCueStyle = (count: number): Web.StyleRecord => {
  const delta = count - counterInitialCount
  const tone = counterCueTone(count)
  const lift = Math.min(Math.abs(delta), 4)

  if (tone === "rising") {
    return {
      backgroundColor: `rgba(16, 185, 129, ${0.14 + lift * 0.06})`,
      boxShadow: `0 0 0 1px rgba(5, 150, 105, ${0.35 + lift * 0.08})`,
      transform: `translateY(${-lift}px)`,
    }
  }

  if (tone === "falling") {
    return {
      backgroundColor: `rgba(249, 115, 22, ${0.14 + lift * 0.06})`,
      boxShadow: `0 0 0 1px rgba(234, 88, 12, ${0.35 + lift * 0.08})`,
      transform: `translateY(${lift}px)`,
    }
  }

  return {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    boxShadow: "0 0 0 1px rgba(37, 99, 235, 0.18)",
    transform: "translateY(0px)",
  }
}

export const CounterRoute = Component.make().pipe(
  Component.state({
    count: () => Atom.make(counterInitialCount).pipe(Atom.keepAlive),
  }),
  Component.actions({
    decrement: ({ count }) => count.update((value) => value - 1),
    increment: ({ count }) => count.update((value) => value + 1),
    reset: ({ count }) => count.set(counterInitialCount),
  }),
  Component.view(({ state, actions }) =>
    html`
      <div class="loom-example-layout" data-route-view="counter">
        <div class="loom-example-hero">
          <span class="loom-example-eyebrow">Example app only</span>
          <h1 class="counter-title">Loom vNext counter</h1>
          <span class="counter-copy">
            This example keeps a single route and teaches the current Loom happy path first: Component.state/actions/view expressed through html templates.
          </span>
          <a href="/todos" class="outline secondary todo-link">Open the todo app example</a>
        </div>

        <div class="loom-example-card">
          <div class="counter-value-card">
            <span class="counter-value-label">Counter state</span>
            <div class="counter-value" data-counter-value="true">
              <span class="counter-value-prefix">Count: </span>
              <span class="counter-dynamic-value" data-counter-dynamic-value="true">${() => `${state.count()}`}</span>
            </div>
            <div class="counter-cue-row">
              <span class="counter-cue-label">Reactive cue</span>
              <span
                class="counter-reactive-cue"
                data-counter-reactive-cue="true"
                data-counter-tone=${() => counterCueTone(state.count())}
                title=${() => `Reactive cue tone: ${counterCueTone(state.count())} (${state.count()})`}
                web:class=${() => [`counter-reactive-cue--${counterCueTone(state.count())}`]}
                web:style=${() => counterCueStyle(state.count())}
              >
                Loom attr/class/style in place
              </span>
            </div>
          </div>

          <div class="counter-actions" data-counter-controls="true">
            <button type="button" class="secondary" data-counter-action="decrement" web:click=${actions.decrement}>-1</button>
            <button type="button" class="contrast" data-counter-action="increment" web:click=${actions.increment}>+1</button>
            <button type="button" class="outline secondary" data-counter-action="reset" web:click=${actions.reset}>Reset</button>
          </div>
        </div>

        <div class="loom-example-note-stack">
          <span class="compat-seam-note" data-compat-seam-note="true">
            Templates author this route now; Html.el stays at the full document boundary only.
          </span>
          <span class="counter-debug-note" data-counter-debug-note="true">
            Reactive cue: templates drive the count text plus Loom-native attr/class/style bindings from Loom state.
          </span>
          <span class="dev-mode-note" data-dev-mode-note="true">
            Dev caveat: in plain Vite dev the browser uses mount(...) to fill the empty root when no payload is present. That fallback is honest DX, not fake full SSR.
          </span>
        </div>
      </div>
    `
  ),
)

export default CounterRoute
