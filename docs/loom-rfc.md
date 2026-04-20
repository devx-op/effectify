# RFC: @effectify/loom Architecture and API v0.1

**Status**: Draft\
**Initiative**: `@effectify/loom`\
**Document Type**: Request for Comments

---

## 1. Purpose

This RFC defines the updated architecture and API direction for the `@effectify/loom` package family. It translates the revised product intent into concrete technical decisions covering package topology, module organization, runtime boundaries, Atom integration, routing direction, future server layering, and testing strategy.

The important correction in this revision is explicit: the earlier Loom direction was strong on runtime capability, but too heavy in its first DX story because it centered SSR/resumability/server concerns too early. The new direction keeps those capabilities important while re-centering the public model on a **tiny-framework feel**, **Effect-first composition**, and **simple interactive ergonomics first**.

---

## 2. Adopted Decisions

### 2.1 Naming and public concepts

- Brand/package family: **`@effectify/loom`**
- Primary public concept: **`Component`**
- Public authoring style: **plain TypeScript only**
- JSX/TSX: **not supported in v0/v1**

### 2.2 Atom-native reactive foundation

- Atom is the reactive foundation.
- Loom does **not** introduce a parallel Loom-native model primitive.
- `Component.model(...)` should consume real Atom values and factories directly.
- Directionally, that includes primitives such as `Atom.make(...)`, `Atom.family(...)`, and `Atom.serializable(...)`.
- An integration surface like `@effectify/loom-atom` is acceptable as a future package direction, but it must remain an integration layer, not a replacement state model.

### 2.3 Strong component typing

- Loom should preserve strong component typing in the direction of:

```ts
Component<Props, Err, Requirements>
```

- This type shape is a design principle, not a documentation flourish.
- Props, error channels, and Effect requirements should remain visible in the public mental model.

### 2.4 Public view/runtime split

- `View` is renderer-agnostic.
- `Web` owns browser/CSS/DOM/platform-specific behavior.
- CSS helpers such as `className` and `style`, DOM attributes, and browser APIs do **not** belong in the neutral `View` namespace.

### 2.5 Composition model

- `Component.actions(...)` is the main bridge from UI declarations to Effect services, HTTP APIs, and RPC APIs.
- `Component.view(...)` should receive a read-friendly reactive facade over model state so authors are not forced into raw `.get()` everywhere.
- `Component.slots(...)` and `Slot` are the official composition/nesting mechanism for layouts, routes, and reusable components.

### 2.6 Router direction

- Router is a separate package, but treated as first-class.
- The route-definition experience should be strongly inspired by Effect `HttpApi`:
  - declaration
  - composition
  - prefixing/grouping
  - annotation
  - reflection
- The router should feel like an Effect-native description system, not just a path table.

### 2.7 Rendering and server direction

- Web is the first renderer and only primary renderer in v0.1.
- The primary DX target is **SPA/simple interactive applications first**.
- SSR, loaders, server actions, resumability, and deployment integrations remain important, but are layered after the core interactive story is strong.
- Future loader/action direction may borrow inspiration from React Router 7, but Loom should express those ideas in Effect-native terms.

### 2.8 Observability and tracing

- Observability/tracing remain first-class Loom strengths.
- The runtime model should preserve explicit visibility into behavior across render, action, routing, and later server boundaries.

---

## 3. Package Topology

### 3.1 Public packages

#### `@effectify/loom`

Primary public package. Owns `Component`, `View`, `Web`, and the core mounting/composition story.

#### `@effectify/loom-router`

Companion router package. Separate installation boundary, aligned conventions, first-class documentation, and `HttpApi`-inspired route composition.

#### `@effectify/loom-vite`

Default tooling and developer experience integration for local development and standard builds.

#### `@effectify/loom-nitro`

Nitro-specific server/SSR target support and integration glue.

#### Directional future package: `@effectify/loom-atom`

Potential companion package for Atom integration ergonomics if needed. This is a **design direction only**, not an already-established package contract.

### 3.2 Internal monorepo layout

```text
packages/loom/
  core/
  runtime/
  web/
  router/
  vite/
  nitro/
```

### 3.3 Package responsibilities

| Package                 | Visibility                          | Responsibility                                                               |
| ----------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| `packages/loom/core`    | Internal                            | Neutral view/runtime contracts, component typing, composition primitives     |
| `packages/loom/runtime` | Internal                            | Runtime execution model, observability/tracing hooks, future server layering |
| `packages/loom/web`     | Public via `@effectify/loom`        | Web renderer and browser/CSS/DOM implementation                              |
| `packages/loom/router`  | Public via `@effectify/loom-router` | Route definition, composition, reflection, navigation integration            |
| `packages/loom/vite`    | Public via `@effectify/loom-vite`   | Vite plugin/tooling integration                                              |
| `packages/loom/nitro`   | Public via `@effectify/loom-nitro`  | Nitro SSR/server target integration                                          |

### 3.4 Boundary rule

`core` and `runtime` must not be published as standalone public npm packages in v0/v1. That boundary is architectural, not accidental.

---

## 4. Module Organization Conventions

Loom should follow the Effect-style code organization and JSDoc conventions already established in the wider Effect ecosystem.

### 4.1 Public module style

- Prefer namespace-style public modules.
- Keep the first-use surface deliberately small.
- Group capabilities under teachable namespaces such as `Component`, `View`, `Web`, `Slot`, and router namespaces.
- Avoid leaking server-specific or browser-specific complexity into the neutral authoring model.

### 4.2 File organization

- Keep modules focused and concept-driven.
- Separate internal implementation from public re-export boundaries.
- Favor explicit exports over wildcard barrel ambiguity in core architectural layers.
- Keep Web/browser code out of renderer-neutral modules.
- Keep future SSR/server helpers out of the core interactive path unless they are explicitly additive.

### 4.3 Documentation style

- Public APIs should carry Effect-style JSDoc with concise purpose, parameter meaning, and behavioral notes.
- Examples should prefer plain TypeScript snippets.
- Docs must clearly distinguish **current implementation** from **target API direction**.
- Docs should avoid presenting future SSR/server capabilities as if they are already the primary experience.

---

## 5. Runtime Model

### 5.1 High-level model

The runtime model separates **component declaration**, **view description**, and **environment-specific execution**:

1. Public `Component` APIs assemble typed component definitions.
2. `Component.view(...)` produces renderer-neutral `View` structures.
3. Internal layers normalize component/view declarations into neutral runtime structures.
4. Renderer-specific packages such as Web interpret those structures for DOM output, interactivity, and later server integration.

This separation keeps Loom web-first without making the authoring model web-locked.

### 5.2 Atom integration model

The key rule is simple: **Loom integrates Atom directly rather than wrapping or replacing it**.

Directional target:

```ts
Component.make("counter").pipe(
  Component.model({
    count: Atom.make(0),
  }),
)
```

This establishes the contract:

- Atom owns state and reactivity.
- Loom owns typed component composition, rendering, and runtime orchestration.
- Loom should not invent `Model.atom(...)` or similar shadow primitives.

### 5.3 Read-friendly state facade in views

`Component.view(...)` should receive a state facade that is ergonomic to read during rendering.

Directional target:

```ts
Component.view(({ state }) => View.text(`Count: ${state.count}`))
```

This means the view layer should not force authors to litter render code with raw `.get()` calls while still preserving the reality that Atom is the underlying source of truth.

### 5.4 Actions as the Effect bridge

`Component.actions(...)` is the primary bridge from component declarations to Effectful behavior.

That bridge should cover:

- local Atom updates,
- access to Effect services,
- integration with HTTP APIs,
- integration with RPC APIs,
- future server-facing flows.

This is preferable to scattering Effect access across unrelated ad hoc handlers because it gives Loom a clear action boundary.

### 5.5 Slot-based composition

Slots are the canonical mechanism for composition and nesting.

Directional target:

```ts
Component.slots({
  default: Slot.required(),
  sidebar: Slot.optional(),
})
```

This should be the official way to express layouts and nesting rather than defaulting to React-children-first framing.

### 5.6 Observability model

Observability/tracing must remain explicit in the runtime architecture.

At minimum, the runtime design should preserve clear instrumentation seams around:

- component mount/update flows,
- action execution,
- route resolution/navigation,
- later server/render hydration boundaries.

---

## 6. View and Web API Direction

### 6.1 Public namespaces

Initial public namespaces should include at least:

- `Component`
- `View`
- `Web`
- `Slot`

Additional namespaces may emerge later, but the early surface should remain deliberately small.

### 6.2 `View`

`View` is the renderer-agnostic DSL.

Directional responsibilities include:

- structural composition,
- text/content nodes,
- control flow helpers,
- neutral layout primitives,
- component/slot rendering.

Directional examples:

```ts
View.stack(...)
View.row(...)
View.text("hello")
View.when(condition, content)
View.main(slot)
```

### 6.3 `Web`

`Web` owns browser-specific concerns.

Directional responsibilities include:

- CSS hooks such as `className(...)`,
- inline styles,
- DOM attributes,
- browser APIs,
- web-only event/runtime affordances.

Directional examples:

```ts
View.stack(...).pipe(
  Web.className("flex flex-col gap-2"),
)
```

This split is important because it preserves the renderer-neutral character of `View` while staying honest about what is actually web-specific.

---

## 7. Router Direction

The router should be treated as a first-class companion package with API design strongly inspired by Effect `HttpApi`.

### 7.1 Router design goals

- routes are declared, not scattered,
- groups compose naturally,
- layouts attach explicitly,
- prefixes and annotations are first-class,
- route definitions can be reflected for tooling/runtime use,
- the system feels like Effect description/composition rather than framework convention magic.

### 7.2 Directional API target

```ts
const appRouter = Router.make("app").pipe(
  Router.add(
    RouteGroup.make("marketing").add(
      Route.make("home").path("/").view(homePage),
      Route.make("about").path("/about").view(aboutPage),
    ),
    RouteGroup.make("app")
      .prefix("/app")
      .layout(appLayout)
      .add(
        Route.make("counter").path("/counter").view(counterPage),
      ),
  ),
)
```

### 7.3 Reflection direction

Router APIs should directionally support operations such as:

- `annotate(...)`
- `reflect(...)`
- extracting route metadata for tooling, navigation, and later server features.

The inspiration from `HttpApi` should be structural and conceptual, not superficial naming only.

---

## 8. Server Layering Direction

### 8.1 Priority rule

The primary DX target is simple interactive applications first. Therefore, SSR/server features are layered on top of the core authoring model rather than defining it.

### 8.2 SSR and resumability

SSR and resumability remain important architectural directions, but this RFC no longer treats them as the first user-facing identity of Loom.

They should be added in a way that:

- preserves the tiny core authoring experience,
- does not force server concepts into every component,
- keeps capabilities explicit and observable.

### 8.3 Future loaders and actions

Future loader/action APIs may borrow inspiration from React Router 7, especially around route-associated data workflows, but Loom should express those patterns through Effect-native composition and type boundaries.

### 8.4 Nitro support

Nitro support belongs in `@effectify/loom-nitro`, not in the base package. The base package owns core component/view/runtime contracts; Nitro owns environment-specific integration.

---

## 9. API Directional Examples

This section captures the intended direction, not a finalized signature freeze.

### 9.1 Counter target DX

```ts
import * as Atom from "effect/unstable/reactivity/Atom"
import { Component, mount, View, Web } from "@effectify/loom"

export const counter = Component.make("counter").pipe(
  Component.model({
    count: Atom.make(0),
  }),
  Component.actions({
    increase: ({ count }) => count.update((n) => n + 1),
    decrease: ({ count }) => count.update((n) => n - 1),
    reset: ({ count }) => count.set(0),
  }),
  Component.view(({ state, actions }) =>
    View.stack(
      View.text(`Count: ${state.count}`),
      View.text(`Doubled: ${state.count * 2}`),
      View.button("Increase", actions.increase),
      View.button("Decrease", actions.decrease),
      View.button("Reset", actions.reset),
    ).pipe(
      Web.className("flex flex-col gap-2"),
    )
  ),
)

mount({ counter })
```

### 9.2 Layout/slot target DX

```ts
import { Component, Slot, View, Web } from "@effectify/loom"

export const appLayout = Component.make("app-layout").pipe(
  Component.slots({
    default: Slot.required(),
    header: Slot.optional(),
    sidebar: Slot.optional(),
  }),
  Component.view(({ slots }) =>
    View.stack(
      View.when(slots.header, View.header(slots.header)),
      View.row(
        View.when(slots.sidebar, View.aside(slots.sidebar)),
        View.main(slots.default),
      ),
    ).pipe(
      Web.className("min-h-screen"),
    )
  ),
)
```

### 9.3 Router target DX

```ts
const appRouter = Router.make("app").pipe(
  Router.add(
    RouteGroup.make("marketing").add(
      Route.make("home").path("/").view(homePage),
      Route.make("about").path("/about").view(aboutPage),
    ),
    RouteGroup.make("app")
      .prefix("/app")
      .layout(appLayout)
      .add(
        Route.make("counter").path("/counter").view(counterPage),
      ),
  ),
)
```

---

## 10. Testing Strategy

Loom should adopt a testing culture inspired by the Effect repository.

### 10.1 Required test categories

- **Runtime tests** for interactive rendering, actions, routing behavior, and later SSR/server integration.
- **dtslint/type tests** for public API correctness and inference behavior.
- **Explicit assertions** instead of vague snapshots as the default confidence mechanism.
- **Regression tests** for any bug fixed in rendering, actions, routing, observability, or later server/runtime interactions.

### 10.2 Testing priorities

Highest-value early coverage areas:

1. `Component.model(...)` Atom-native integration semantics
2. `Component.actions(...)` typing and runtime behavior
3. `Component.view(...)` state facade ergonomics and inference
4. slot composition and layout behavior
5. router declaration/composition/reflection behavior
6. package-level type surface for namespace-style modules
7. observability/tracing boundaries in runtime flows

### 10.3 Testing philosophy

- Prefer precise assertions over broad snapshots.
- When a runtime edge case is discovered, add a regression test immediately.
- Type-level behavior is part of the public contract and must be tested, not assumed.
- Future SSR/server features must prove they layer onto the existing DX without distorting the core API.

---

## 11. Open Questions

- What exact component constructor/combinator surface best preserves `Component<Props, Err, Requirements>` inference?
- What is the right state facade shape for `Component.view(...)` so it stays ergonomic without hiding Atom reality?
- Which router reflection APIs are essential in the first public router slice?
- Should `@effectify/loom-atom` exist, and if yes, what ergonomics belong there instead of the base package?
- What is the first SSR/server capability worth adding once the interactive DX is stable?

---

## 12. Summary

This RFC revises Loom's technical direction around a simpler and stronger DX target: Atom-native state, strongly typed `Component` boundaries, renderer-agnostic `View`, Web-specific browser/CSS APIs, slot-based composition, `HttpApi`-inspired routing, and explicit observability/tracing. SSR, resumability, loaders, and server integration remain important, but they are now intentionally framed as layered capabilities after the tiny, Effect-first interactive model already works beautifully.
