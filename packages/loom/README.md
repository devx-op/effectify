# Loom package surface

This directory contains the Loom package family for the `loom-web-runtime` change.

## Supported public package surface

- `@effectify/loom` — base web runtime surface
- `@effectify/loom-router` — router companion package
- `@effectify/loom-vite` — Vite integration package
- `@effectify/loom-nitro` — Nitro integration package

## `@effectify/loom` primary root surface

For the current vNext authoring story, teach the root happy path in this order:

1. `Component`
2. `View`
3. `Web`
4. `Slot`
5. `mount`

This is the primary documented/public contract for new Loom authoring.

### Current component authoring story

```ts
import { Atom } from "effect/unstable/reactivity"
import { Component, html, mount, Slot, View, Web } from "@effectify/loom"

export const CounterRoute = Component.make("CounterRoute").pipe(
  Component.state({
    count: Atom.make(0),
    draft: () => Atom.make(""),
  }),
  Component.actions({
    increment: ({ count }) => count.update((value) => value + 1),
  }),
  Component.view(({ state, actions, children }) =>
    View.vstack(
      View.text("Counter").pipe(Web.as("h1")),
      View.text(() => `Count: ${state.count()}`),
      View.main(children),
      View.button("Increase", actions.increment),
    )
  ),
)

mount({ CounterRoute })
```

### Template-first authoring path

For new DOM-heavy authoring, prefer `html` inside `Component.view(...)` and keep `View` focused on composition.

```ts
import * as Result from "effect/Result"
import { Atom } from "effect/unstable/reactivity"
import { Component, html, Slot, View } from "@effectify/loom"

const Card = Component.make("Card").pipe(
  Component.view(({ children }) => html`<article class="card">${children}</article>`),
)

const Layout = Component.make("Layout").pipe(
  Component.slots({
    default: Slot.required(),
    header: Slot.optional(),
  }),
  Component.view(({ slots }) =>
    html`
    <section>
      ${slots.header}
      <main>${slots.default}</main>
    </section>
  `
  ),
)

export const TemplateCounter = Component.make("TemplateCounter").pipe(
  Component.model({ count: Atom.make(0) }),
  Component.actions({
    increment: ({ count }) => count.update((value) => value + 1),
  }),
  Component.view(({ state, actions }) =>
    html`
    <section>
      <button type="button" web:click=${actions.increment}>Increase</button>
      <p>${() => state.count()}</p>
      ${View.use(Card, html`<strong>Count card</strong>`)}
      ${
      View.use(Layout, {
        header: html`<h2>Status</h2>`,
        default: View.match(Result.succeed("ready"), {
          onSuccess: (value) => html`<p>${value}</p>`,
          onFailure: (error) => html`<p>${String(error)}</p>`,
        }),
      })
    }
    </section>
  `
  ),
)
```

- Prefer `html` for ordinary DOM structure.
- Use `View.use(...)` for component composition. Child shorthand is only for components without required props; slot components receive a slot object.
- Use `View.match(...)` for `Result`, `AsyncResult`, and `_tag`-based branching instead of inline switches in templates.
- Keep list rendering explicit with `View.for(...)`; direct array interpolation stays unsupported.

### Phase-1 reactivity rule

- `${() => state.count()}` is reactive because Loom can track the thunk boundary.
- `${state.count()}` is an eager snapshot and does **not** update after the template is created.
- Supported phase-1 directives are limited to `web:click`, `web:value` / `web:inputValue`, and `web:hydrate`.

### Follow-ups intentionally out of scope

- Accessor-style reactive sugar beyond the explicit lambda form.
- `web:class` and `web:style` template directives.

- Teach `Component.state(...)` as the ONLY public state seam.
- Treat `Component.model(...)` as compatibility-only.
- `children` is always available in `Component.view(...)`; ordinary composition should be implicit.
- Keep registry plumbing at the app/root entry only via `mount(...)`.

### Current route-module authoring story

```ts
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { Route, RouteModule, Router } from "@effectify/loom-router"
import { CounterRoute } from "./counter-route.js"

const TodoItem = Schema.Struct({ id: Schema.Number, title: Schema.String, completed: Schema.Boolean })

export const loader = Route.loader({
  output: Schema.Array(TodoItem),
  load: Effect.fn(function*() {
    return []
  }),
})

export const counterPageRoute = RouteModule.compile({
  identifier: "counter",
  module: { component: CounterRoute, loader },
  path: "/",
})

export const appRouter = Router.make({
  routes: [counterPageRoute],
})
```

- Teach route modules through `component` / optional `loader` / optional `action` exports.
- Prefer `Route.loader({...})` and `Route.action({...})` inline schema-first helpers.
- Keep descriptor-style route assembly and manual registry propagation out of the public examples.

## Compatibility and advanced seams

- `Html` — compatibility-first low-level AST / SSR seam; prefer `View` + `Web` for new authoring
- `Diagnostics` — advanced runtime visibility helpers
- `Hydration` — advanced hydration helpers layered after the primary interactive path
- `Resumability` — advanced resumability helpers layered after the primary interactive path

## Internal-only packages

- `@effectify/loom-core` — neutral AST and composition contracts
- `@effectify/loom-runtime` — hydration, event, and runtime execution internals

`@effectify/loom-core` and `@effectify/loom-runtime` stay internal-only even though the workspace uses them directly. They are not part of the public package surface and must remain private workspace implementation details.
