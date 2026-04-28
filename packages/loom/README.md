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

export const CounterRoute = Component.make().pipe(
  Component.state({
    count: Atom.make(0),
    draft: () => Atom.make(""),
  }),
  Component.actions({
    increment: ({ count }) => count.update((value) => value + 1),
  }),
  Component.view(({ state, actions, children }) =>
    html`
    <section>
      <h1>Counter</h1>
      <p>${() => state.count()}</p>
      <main>${children}</main>
      <button type="button" web:click=${actions.increment}>Increase</button>
    </section>
  `
  ),
)

mount({ CounterRoute })
```

Use `Component.make()` as the default authoring path. Keep `Component.make("Name")` for observability, diagnostics, or any place where authored metadata matters.

### Template-first authoring path

For new DOM-heavy authoring, prefer `html` inside `Component.view(...)` and keep `View` focused on composition.

```ts
import * as Result from "effect/Result"
import { Atom } from "effect/unstable/reactivity"
import { Component, html, Slot, View } from "@effectify/loom"

const Card = Component.make().pipe(
  Component.view(() => html`<article class="card">Count card</article>`),
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

export const TemplateCounter = Component.make().pipe(
  Component.model({ count: Atom.make(0) }),
  Component.actions({
    increment: ({ count }) => count.update((value) => value + 1),
  }),
  Component.view(({ state, actions }) =>
    html`
    <section>
      <button type="button" web:click=${actions.increment}>Increase</button>
      <p
        class="counter-value"
        web:class=${() => [state.count() > 0 ? "counter-value--active" : undefined]}
        web:style=${() => ({ opacity: state.count() > 0 ? 1 : 0.6 })}
      >
        ${state.count}
      </p>
      ${View.of(Card)}
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
- Use `View.of(...)` for trivial no-props/no-slots composition.
- Use `View.use(...)` for props, children, and slot objects. Child shorthand is only for components without required props; slot components receive a slot object.
- Use `View.match(...)` for `Result`, `AsyncResult`, and `_tag`-based branching instead of inline switches in templates.
- Keep list rendering explicit with `View.for(...)`; direct array interpolation stays unsupported.

Migration checklist for explicit APIs:

- Keep `Component.make("Name")` when observability or diagnostics need stable authored names.
- Keep `View.use(...)` when the component needs props, children, or slots.
- Prefer `View.of(...)` only for trivial leaf usage with no required props and no slot inputs.

### Legacy View DOM helpers are compatibility-only

`View.button(...)`, `View.input()`, and `View.link(...)` are still supported, but they are compatibility-only helpers now. New DOM authoring should prefer `html` plus `web:*` directives.

Migration pairs:

- `View.button(...)` → `html` + `<button type="button" web:click=${handler}>...</button>`
- `View.input()` → `html` + `<input web:value=${value}>` or `<input web:inputValue=${value}>`
- `View.link(...)` → `html` + `<a href="/docs">...</a>`

There is no scheduled removal in the current package line. Any future removal requires a separate approved proposal and a breaking-release plan.

### Phase-1 reactivity rule

- `${state.count}` is reactive template sugar for the common Loom-owned accessor case.
- `${() => state.count()}` is still reactive and remains the explicit escape hatch for computed expressions.
- `${state.count()}` is an eager snapshot and does **not** update after the template is created.
- Only Loom-branded accessors created by `Component.state(...)` / `Component.model(...)` get the bare-accessor sugar. Arbitrary zero-argument helpers are still supported when you pass them intentionally as `${() => ...}` / `${helper}`, but Loom does **not** auto-track plain expressions like `${state.count() + 1}` or `${format(state.title)}` unless you wrap them in an explicit function boundary.
- Supported phase-1 directives are limited to `web:click`, `web:input`, `web:submit`, `web:value` / `web:inputValue`, `web:hydrate`, `web:class`, and `web:style`.

### Template class/style directives

- `web:class` accepts a `string`, or a flat array of `string | false | null | undefined` tokens.
- `web:style` accepts a CSS declaration string or a Loom `Web.StyleRecord` object.
- Thunks stay reactive; eager values stay snapshot-only, just like text interpolation.
- Static `class` / `style` attributes remain the base layer and `web:class` / `web:style` append on top.

### Follow-ups intentionally out of scope

- Accessor-style reactive sugar beyond the explicit lambda form.

- Teach `Component.state(...)` as the ONLY public state seam.
- Treat `Component.model(...)` as compatibility-only.
- `children` is always available in `Component.view(...)`; ordinary composition should be implicit.
- Keep registry plumbing at the app/root entry only via `mount(...)`.

### Current route-module authoring story

```ts
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { pipe } from "effect"
import { Route, RouteModule, Router } from "@effectify/loom-router"
import { CounterRoute } from "./counter-route.js"

const TodoItem = Schema.Struct({ id: Schema.Number, title: Schema.String, completed: Schema.Boolean })

export default CounterRoute

export const loader = Route.loader({
  output: Schema.Array(TodoItem),
  load: Effect.fn(function*() {
    return []
  }),
})

export const counterPageRoute = RouteModule.compile({
  identifier: "counter",
  module: { default: CounterRoute, loader },
  path: "/",
})

export const appRouter = pipe(
  Router.make("app"),
  Router.route(counterPageRoute),
)
```

- Teach route modules through `export default` plus optional named `loader` / `action` exports.
- `component` remains fully supported for legacy modules and still wins if a module exports both `component` and `default`.
- Teach router assembly through `Router.make("app")` plus incremental operators like `Router.route(...)`, `Router.layout(...)`, and `Router.notFound(...)`.
- Prefer `Route.loader({...})` and `Route.action({...})` inline, passing service requirements via `services: Route.services<...>()` so `params`, `search`, `input`, and `services` infer automatically.
- Keep `Route.ModuleLoaderContext<typeof options, Services>` / `Route.ModuleActionContext<typeof options, Services>` as explicit compatibility escapes when you prefer to annotate handler params.
- Keep descriptor-style route assembly and manual registry propagation out of the public examples.

Migration checklist:

- New modules: prefer `export default` for route content.
- Existing modules: keep `export const component = ...` if changing exports is noisy.
- Mixed modules: if both `component` and `default` exist, Loom will use `component` for backward-compatible resolution.

Compatibility note: `Router.from({ routes, layout, fallback })` and `Router.make({ ... })` remain available for existing code, but builder-first composition is the primary public story.

## Compatibility and advanced seams

- `Html` — compatibility-first low-level AST / SSR seam; prefer `View` + `Web` for new authoring
- `Diagnostics` — advanced runtime visibility helpers
- `Hydration` — advanced hydration helpers layered after the primary interactive path
- `Resumability` — advanced resumability helpers layered after the primary interactive path

## Internal-only packages

- `@effectify/loom-core` — neutral AST and composition contracts
- `@effectify/loom-runtime` — hydration, event, and runtime execution internals

`@effectify/loom-core` and `@effectify/loom-runtime` stay internal-only even though the workspace uses them directly. They are not part of the public package surface and must remain private workspace implementation details.
