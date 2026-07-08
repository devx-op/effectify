# PRD: @effectify/loom

**Status**: Draft\
**Initiative**: `@effectify/loom`\
**Document Type**: Product Requirements Document

---

## 1. Summary

`@effectify/loom` is an Effect-native UI initiative for building interactive applications with plain TypeScript, a renderer-agnostic View DSL, and Atom as the real state/reactivity model.

The updated product direction keeps Loom's runtime ambitions while correcting a DX problem in the earlier framing: the previous direction was strong on SSR/resumability/server capability, but too heavy for the first developer experience. The new direction is to make Loom feel **tiny**, **Effect-first**, and **simple for SPA/interactive work first**, while still preserving SSR, server integration, and observability as serious long-term strengths.

Loom is therefore positioned as the **view/runtime/orchestration layer above Atom**, not as a competing state system. The core mental model is:

- **Atom** owns state and reactivity.
- **Component** owns typed composition and orchestration.
- **View** stays renderer-agnostic.
- **Web** owns CSS, DOM attributes, and browser-specific behavior.
- **Router** should feel strongly inspired by Effect `HttpApi` declaration/composition/reflection patterns.

---

## 2. Problem

Effectify has packages that integrate Effect with existing frameworks, but it does not yet offer a native UI runtime designed around Effect patterns from the ground up.

The previous Loom direction correctly emphasized runtime power, but it over-indexed on SSR/resumability-first ergonomics. That creates adoption friction for the most common early use case: developers want to build a small interactive app, wire real state, call real Effect services, and stay in plain TypeScript without feeling like they adopted a giant framework.

Today, teams that want Effect-native UI development typically face one or more of these problems:

- They must adopt JSX/TSX even when they want a plain TypeScript API.
- Their view model is tied to one renderer instead of a neutral declarative representation.
- State integration is often wrapped in framework-specific abstractions instead of exposing real Atom primitives directly.
- Browser/CSS concerns leak into otherwise portable view code.
- Router APIs often feel separate from the wider Effect ecosystem instead of following familiar declaration/composition patterns.
- SSR/server patterns dominate the teaching story before the simple interactive story feels excellent.

The opportunity for `@effectify/loom` is to provide a coherent, tiny-feeling, Effect-first UI system with strong typing, honest package boundaries, first-class observability, and a progression from **simple interactive DX first** to **SSR/server integration later**.

---

## 3. Target Users

### Primary users

- Effect developers who want a UI stack designed around Effect patterns.
- TypeScript developers who prefer explicit APIs over JSX/TSX syntax.
- Teams building SPA-style or lightly interactive applications who want the smallest possible conceptual surface.

### Secondary users

- Library authors building higher-level abstractions on top of a strongly typed `Component<Props, Err, Requirements>` model.
- Teams that want SSR/server capabilities later without abandoning the initial DX.
- Teams that care about tracing/observability and want UI runtime behavior to remain visible, not magical.

---

## 4. Product Goals

### Goal 1: Establish a clear public identity

The package family must ship under the **`@effectify/loom`** brand, with **Component** as the primary public concept and a deliberately small first impression.

### Goal 2: Be Effect-first and Atom-native

Atom is the real state/reactivity model. Loom must integrate **real Atom primitives directly** rather than inventing a Loom-native replacement such as `Model.atom(...)`.

`Component.state(...)` should accept real shared/materialized Atom values plus per-instance factory entries such as `() => Atom.make(...)`. `Component.model(...)` remains compatibility-only during migration.

### Goal 3: Preserve strong typing as a core value

The public model should preserve a strong component type shape in the direction of:

```ts
Component<Props, Err, Requirements>
```

This typing principle is central to Loom's identity, not an optional refinement.

### Goal 4: Deliver a plain TypeScript, tiny-framework-feeling DX

The public API must avoid JSX/TSX entirely in v0/v1. Authoring should feel lightweight, teachable, and easy to read in ordinary TypeScript modules.

### Goal 5: Keep View portable and Web explicit

`View` must remain renderer-agnostic, while browser- and platform-specific concerns live under `Web`.

That means concerns such as `className`, `style`, DOM attributes, and browser APIs belong to `Web`, not the core neutral view DSL.

### Goal 6: Make composition explicit and teachable

Loom should teach a two-lane composition model:

- `children` is always available in `Component.view(...)` for ordinary unnamed composition.
- `Component.slots(...)` and `Slot` are for named structural composition such as layouts, shells, and route frames.

The docs should make this distinction explicit instead of teaching slots as the answer to every nesting case.

### Goal 7: Make actions the Effect bridge

`Component.actions(...)` should be the main bridge from components to Effect services, HTTP APIs, and RPC APIs.

### Goal 8: Ship SPA/simple-interactive DX first

The first teaching story and first user delight should come from local interactive applications. SSR, loaders, server actions, resumability, and server integration remain important, but should be layered after the simple interactive path feels excellent.

### Goal 9: Keep observability first-class

Tracing and observability must remain explicit product differentiators. Loom should not gain simplicity by hiding runtime behavior that developers may need to inspect.

---

## 5. Scope

### In scope for v0/v1 direction

- A public `@effectify/loom` package with namespace-style modules.
- **Component** as the central public abstraction.
- A renderer-agnostic **View** DSL.
- A **Web** namespace for CSS, DOM attributes, and browser-specific capabilities.
- Atom-native state integration through `Component.state(...)` using real Atom primitives and local thunk entries.
- A read-friendly reactive facade in `Component.view(...)`, so view code does not require raw `.get()` calls everywhere.
- `Component.actions(...)` as the bridge to Effect services and remote APIs.
- `ViewChild` as the broad composition type for unnamed content and primitive child content.
- implicit `children` availability inside `Component.view(...)` for ordinary/default nesting.
- `Component.slots(...)` / `Slot` for named structural composition.
- `Component.use(component, props?, childrenOrSlots?)` supporting both children-based and slot-based composition shapes.
- `View.vstack` / `View.hstack` as the preferred directional layout primitives.
- `View.stack` retained only as a compatibility alias/directional bridge.
- `Html.*` retained as a low-level/compatibility surface, not the primary teaching path.
- A router direction strongly inspired by Effect `HttpApi`-style declaration, composition, annotation, and reflection.
- Web-first rendering.
- Observability/tracing as first-class runtime concerns.
- Initial package layout under `packages/loom/{core,runtime,web,router,vite,nitro}`.
- Effect-style code organization and JSDoc conventions.
- A test strategy that includes runtime and type-level verification.

### Important future direction, but not the primary DX target

- SSR support.
- Server actions/loaders.
- Resumability/dehydration flows.
- Nitro/server deployment integration.
- A companion Atom-focused integration surface such as `@effectify/loom-atom`.

These remain important, but the docs and API direction should treat them as **layered capabilities after the core interactive DX** rather than the first identity Loom teaches.

### Out of scope for v0/v1

- JSX or TSX authoring.
- A Loom-native replacement for Atom.
- Public npm publication of `@effectify/loom-core` or `@effectify/loom-runtime`.
- Non-web primary renderers.
- A monolithic package that bundles router, Vite integration, and server integrations together.
- Collapsing browser-only concerns into the core neutral `View` namespace.

---

## 6. Non-Goals

These are intentionally NOT goals for the first line of the initiative:

- Replacing Atom with Loom-owned model primitives.
- Optimizing for SSR-first teaching at the expense of simple interactive DX.
- Replacing every existing UI framework abstraction in one release.
- Solving native/mobile rendering in v1.
- Providing a fully integrated router inside the base package.
- Optimizing for JSX ergonomics.

---

## 7. Product Principles

- **Tiny framework feel**: the first experience should feel small, direct, and unsurprising.
- **Effect-first, not framework-first**: the design should reflect Effect patterns before ecosystem fashion.
- **Atom-native, not Atom-inspired**: Loom integrates real Atom directly instead of inventing a parallel reactive model.
- **Strong types at the boundary**: `Component<Props, Err, Requirements>` style typing remains a defining product value.
- **Renderer-neutral View, explicit Web**: portability comes from a clean boundary, not from pretending browser APIs are universal.
- **Teach the right composition tool**: ordinary/default composition should use `children`; named structural composition should use `Slot`.
- **Broad child content for primitives**: interactive primitives should accept `ViewChild`, not force string-only labels.
- **Simple interactive first, server capabilities later**: the smallest app should feel excellent before advanced deployment/runtime stories dominate the API.
- **Directional layout should read plainly**: prefer `View.vstack` / `View.hstack`; keep `View.stack` only as compatibility language.
- **Html stays low-level**: `Html.*` may remain available for compatibility and escape hatches, but it is not the teaching path.
- **Observability is a feature**: tracing and runtime visibility are strengths to preserve, not incidental implementation details.

---

## 8. Success Criteria

### Product success

- Developers can explain Loom in one sentence: **Atom-native Effect UI with typed components, a portable View DSL, and explicit Web/runtime integrations**.
- Developers can build a small interactive application with plain TypeScript and real Atom state using only documented public APIs.
- Developers understand that Loom is not replacing Atom; it is building above it.
- Developers can distinguish when to use `children` versus named `Slot` composition without needing JSX/TSX mental models.
- Developers can migrate legacy compatibility helpers such as `View.button(...)`, `View.input()`, and `View.link(...)` toward `html` + `web:*` without losing support for existing call sites.
- Developers encounter `View.vstack` / `View.hstack` as the default layout vocabulary.

### Technical success

- The internal architecture preserves a renderer-agnostic view/runtime boundary.
- `Component.state(...)` accepts real Atom constructs without a Loom-owned shadow abstraction.
- `Component.view(...)` exposes a read-friendly state facade suitable for ergonomic rendering.
- The API surface preserves strong component typing and type inference expectations.
- Observability/tracing remain explicit in runtime architecture and documentation.
- SSR/server integration can layer on top of the core model without changing the primary authoring story.

---

## 9. Directional API Examples

The examples below describe the **target DX direction**, not a claim that every signature already exists today.

### Composition target DX

The target composition story should be documented this way:

- `ViewChild` is the broad composition type for primitives and unnamed/default content.
- `children` is provided implicitly to `Component.view(...)` as the standard unnamed/default-content mechanism.
- `Component.slots(...)` / `Slot` are for named structural composition.
- `Component.use(component, props?, childrenOrSlots?)` should accept either plain children content or a named slot object depending on the component contract.
- `Html.*` remains available as a lower-level or compatibility surface, but is not the main path used to teach Loom.
- `View.button(...)`, `View.input()`, and `View.link(...)` are legacy compatibility helpers; docs should steer new DOM authoring to `html` + `web:*`.

Directional examples:

```ts
html`<button type="button" web:click=${actions.increment}>Increase</button>`

html`
  <button type="button" web:click=${actions.increment}>
    ${View.hstack(Icon.plus(), View.text("Increase"))}
  </button>
`

html`<input web:value=${state.search()} />`

html`<a href="/docs">${View.hstack(Icon.externalLink(), View.text("Docs"))}</a>`
```

### Counter target DX

```ts
import * as Atom from "effect/unstable/reactivity/Atom"
import { Component, html, mount, View, Web } from "@effectify/loom"

export const CounterRoute = Component.make("CounterRoute").pipe(
  Component.state({
    count: Atom.make(0),
  }),
  Component.actions({
    increment: ({ count }) => count.update((n) => n + 1),
    decrement: ({ count }) => count.update((n) => n - 1),
    reset: ({ count }) => count.set(0),
  }),
  Component.view(({ state, actions }) =>
    html`
      <section class="gap-2">
        <h1>Counter</h1>
        <p>${() => state.count()}</p>
        <p>${() => state.count() * 2}</p>
        <div>
          <button type="button" web:click=${actions.decrement}>Decrease</button>
          <button type="button" web:click=${actions.increment}>Increase</button>
          <button type="button" web:click=${actions.reset}>Reset</button>
        </div>
      </section>
    `
  ),
)

mount({ CounterRoute })
```

### children-based component target DX

```ts
const Card = Component.make("Card").pipe(
  Component.view(({ children }) => View.box(children).pipe(Web.className("card"))),
)
```

### Layout and slot target DX

```ts
import { Component, Slot, View, Web } from "@effectify/loom"

export const AppLayout = Component.make("AppLayout").pipe(
  Component.slots({
    header: Slot.optional(),
    sidebar: Slot.optional(),
    default: Slot.required(),
  }),
  Component.view(({ slots }) =>
    View.vstack(
      View.when(slots.header, View.header(slots.header)),
      View.hstack(
        View.when(slots.sidebar, View.aside(slots.sidebar)),
        View.main(slots.default),
      ),
    )
  ),
)
```

### Component.use target DX

```ts
Component.use(Card, { tone: "info" }, View.text("Saved"))

Component.use(AppLayout, {}, {
  header: View.text("Dashboard"),
  default: Component.use(Card, {}, View.text("Body")),
})
```

`View.stack(...)` may continue to exist as a compatibility alias or directional bridge, but the docs should teach `View.vstack(...)` and `View.hstack(...)` first.

Similarly, `Html.*` may still exist as a lower-level or compatibility layer, but product-facing Loom docs should present `View` + `Web` as the primary authoring path.

`View.button(...)`, `View.input()`, and `View.link(...)` are legacy compatibility helpers. Keep them callable, but teach `html` + `web:click`, `web:value` / `web:inputValue`, and `<a href="...">` first.

### Router target DX

```ts
export const loader = Route.loader({
  output: CounterData,
  load: Effect.fn(function*() {
    return { count: 0 }
  }),
})

export const counterPageRoute = RouteModule.compile({
  identifier: "counter",
  module: { component: CounterRoute, loader },
  path: "/counter",
})

const appRouter = Router.make({
  routes: [counterPageRoute],
})
```

---

## 10. Milestone Roadmap

### Phase 0: Architecture and package foundation

- Lock package topology and monorepo layout.
- Define public namespace-style module boundaries.
- Establish Effect-style code organization and JSDoc conventions.
- Define the renderer-agnostic view/runtime seams.
- Preserve strong component typing as an explicit architectural requirement.

### Phase 1: Core interactive DX

- Deliver `@effectify/loom` with initial `Component`, `View`, and `Web` direction.
- Prove Atom-native `Component.state(...)` with shared values and per-instance thunk factories.
- Prove `Component.actions(...)` as the bridge to Effectful behavior.
- Prove read-friendly state access inside `Component.view(...)`.
- Establish the composition split: `children` for ordinary/default content, `Slot` for named structural composition.
- Establish `View.vstack` / `View.hstack` as the preferred layout vocabulary.

### Phase 2: Router and composition maturity

- Deliver `@effectify/loom-router` with `HttpApi`-inspired route declaration/composition.
- Add route grouping, prefixing, layout attachment, annotation, and reflection direction.
- Make route/layout slot composition feel official and teachable.

### Phase 3: Server layering and deployment integrations

- Layer SSR onto the established interactive DX.
- Explore loaders/actions inspired by React Router 7, but expressed in Effect-native terms.
- Deliver `@effectify/loom-vite` as the default tooling path.
- Deliver `@effectify/loom-nitro` as a supported server target.
- Preserve observability/tracing through server/client boundaries.

---

## 11. Risks and Mitigations

### Risk: Tiny DX could drift into underpowered abstraction

**Why it matters**: oversimplifying the API could erase what makes Loom distinct.\
**Mitigation**: keep strong typing, Effect integration, routing composition, and observability explicit even while the first-use story stays small.

### Risk: Direct Atom integration creates design pressure on ergonomics

**Why it matters**: if view code requires constant raw `.get()` access, the API will feel clumsy.\
**Mitigation**: keep Atom as the source of truth, but expose a read-friendly facade inside `Component.view(...)`.

### Risk: Renderer neutrality becomes vague marketing

**Why it matters**: mixing CSS/DOM concerns into `View` would weaken portability.\
**Mitigation**: keep `View` renderer-agnostic and push browser-specific APIs under `Web`.

### Risk: Router separation may feel fragmented

**Why it matters**: too much separation can damage perceived cohesion.\
**Mitigation**: make the router separate but first-class, with Effect-familiar declaration/composition patterns.

### Risk: Server/runtime features overshadow the core story again

**Why it matters**: Loom could repeat the original DX problem if advanced features dominate too early.\
**Mitigation**: document SSR, loaders, server actions, and resumability as important layered capabilities rather than the first product identity.

---

## 12. Open Product Questions

- What is the minimum “hello world” that proves the tiny-framework feel is real?
- What exact read-friendly facade should `Component.view(...)` expose over Atom-backed model state?
- Should an Atom-focused helper package such as `@effectify/loom-atom` exist, and if so, what belongs there versus the main package?
- What router reflection APIs are required for the `HttpApi` inspiration to feel concrete rather than superficial?
- Which SSR/server features should be taught first once the interactive DX is stable?

---

## 13. Conclusion

`@effectify/loom` is now explicitly aimed at a different DX target than the earlier draft: keep the runtime ambition, but make the authoring experience small, Atom-native, strongly typed, and easy to reach for interactive applications first. Loom should remain Effect-first, preserve observability/tracing as a differentiator, and layer SSR/server capabilities after the tiny, teachable core already feels excellent.
