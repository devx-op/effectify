# RFC: @effectify/loom Architecture and API v0.1

**Status**: Draft\
**Initiative**: `@effectify/loom`\
**Document Type**: Request for Comments

---

## 1. Purpose

This RFC defines the initial architecture and API direction for the `@effectify/loom` package family. It translates the product intent into concrete technical decisions covering package topology, module organization, runtime boundaries, SSR/hydration behavior, API draft v0.1, and testing strategy.

The core design constraint is simple: **the public model should feel small, but the internal model must remain strong and extensible**.

---

## 2. Adopted Decisions

### 2.1 Naming and public concepts

- Brand/package family: **`@effectify/loom`**
- Primary public concept: **`Component`**
- Public authoring style: **plain TypeScript only**
- JSX/TSX: **not supported in v0/v1**

### 2.2 Reactive foundation

- Atom from the local Effect v4 beta reference is the reactive foundation.
- Atom is an **obligatory peer dependency** for the public stack.
- Loom does not introduce a parallel reactive primitive in v0.1.

### 2.3 Internal model

- The internal representation is a **neutral AST**.
- The AST is not a public compatibility contract in v0.1.
- Renderer-specific behavior belongs below the AST boundary, not in the public component contract.

### 2.4 Renderer and deployment direction

- Web renderer is the first renderer and the only primary renderer in v0.1.
- SSR + hydration are supported in v1.
- Hydration is **opt-in by attribute**.
- Vite is the default tooling path.
- Nitro is a supported SSR target.

### 2.5 Router and packaging

- Router is a separate package, but treated as first-class.
- `core` and `runtime` are internal monorepo packages only in v0/v1.
- Public npm packages in v0/v1:
  - `@effectify/loom`
  - `@effectify/loom-router`
  - `@effectify/loom-vite`
  - `@effectify/loom-nitro`

---

## 3. Package Topology

### 3.1 Public packages

#### `@effectify/loom`

Primary public package. Owns the `Component`, `Html`, and hydration-facing APIs.

#### `@effectify/loom-router`

Companion router package. Separate installation boundary, aligned conventions, first-class documentation.

#### `@effectify/loom-vite`

Default tooling and developer experience integration for local development and standard builds.

#### `@effectify/loom-nitro`

Nitro-specific SSR target support and integration glue.

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

| Package                 | Visibility                          | Responsibility                                                         |
| ----------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| `packages/loom/core`    | Internal                            | Neutral AST types, core contracts, composition primitives              |
| `packages/loom/runtime` | Internal                            | Runtime execution model, hydration coordination, event runtime context |
| `packages/loom/web`     | Public via `@effectify/loom`        | Web renderer and DOM-facing implementation                             |
| `packages/loom/router`  | Public via `@effectify/loom-router` | Routing primitives and navigation integration                          |
| `packages/loom/vite`    | Public via `@effectify/loom-vite`   | Vite plugin/tooling integration                                        |
| `packages/loom/nitro`   | Public via `@effectify/loom-nitro`  | Nitro SSR target integration                                           |

### 3.4 Boundary rule

`core` and `runtime` must not be published as standalone public npm packages in v0/v1. That boundary is architectural, not accidental.

---

## 4. Module Organization Conventions

Loom should follow the **Effect-style code organization and JSDoc conventions** already established in the wider Effect ecosystem.

### 4.1 Public module style

- Prefer namespace-style public modules.
- Avoid dumping a large number of top-level functions directly from a flat index.
- Group related capabilities under teachable namespaces such as `Component`, `Html`, and `Hydration`.

### 4.2 File organization

- Keep modules focused and concept-driven.
- Separate internal implementation from public re-export boundaries.
- Favor explicit exports over wildcard barrel ambiguity in core architectural layers.
- Keep runtime-only code out of purely declarative modules.

### 4.3 Documentation style

- Public APIs should carry Effect-style JSDoc with concise purpose, parameter meaning, and behavioral notes.
- Examples should prefer plain TypeScript snippets.
- Behavioral footguns, especially around hydration and runtime context, must be documented at the API boundary.

---

## 5. Runtime Model

### 5.1 High-level model

The runtime model separates **declaration**, **render planning**, and **environment-specific execution**:

1. Public `Component` and `Html` APIs produce declarative structures.
2. Internal layers normalize those structures into a neutral AST.
3. The web/runtime packages interpret the AST for SSR output, client rendering, event wiring, and hydration.

This separation is what keeps Loom web-first without making it web-locked.

### 5.2 Reactive bridge

The first reactive bridge is:

```ts
Html.live(atom, render)
```

This bridge establishes a contract:

- Atom owns reactive state propagation.
- Loom owns how reactive state becomes updated HTML/DOM behavior.
- The `render` callback maps Atom values into declarative HTML/component output.

Loom should not hide Atom. It should integrate with Atom directly and intentionally.

### 5.3 Event runtime model

`Html.on(...)` must support two forms:

#### Simple Effect form

For straightforward handlers where only the Effect matters.

#### Contextual form

For advanced handlers that require structured runtime access:

```ts
{
  event, target, runtime
}
```

This contextual form is important because event handling in a runtime-driven system is not just “call a callback”. It often needs access to the DOM target, event object, and runtime services coordinating the live tree.

### 5.4 Canonical composition API

The canonical early composition API is:

```ts
Component.use(...)
```

This is the primary composition mechanism for v0.1 and should be treated as the most teachable path while the ecosystem is still forming.

---

## 6. SSR and Hydration Model

### 6.1 SSR direction

SSR is a first-line feature, not a later add-on. The server renderer should produce HTML from the neutral AST through the web renderer path.

### 6.2 Hydration direction

Hydration is supported in v1, but **only when explicitly marked**. This is a deliberate rejection of blanket hydration.

### 6.3 Primary hydration helper

The primary hydration helper is:

```ts
Html.hydrate(Hydration.strategy)
```

This keeps hydration declaration close to the HTML/component boundary rather than scattering it across build config or framework-only conventions.

### 6.4 Opt-in by attribute

Hydration eligibility must be encoded by attribute. That rule is important because it creates a stable handshake between:

- server-rendered markup,
- client bootstrap logic,
- runtime hydration scanning.

This enables selective live islands without forcing the entire page into client ownership.

### 6.5 Nitro support

Nitro support belongs in `@effectify/loom-nitro`, not in the base package. The base package owns renderer contracts; Nitro owns environment-specific SSR integration.

---

## 7. API Draft v0.1

This section captures the intended direction, not a finalized signature freeze.

### 7.1 Public namespaces

Initial public namespaces should include at least:

- `Component`
- `Html`
- `Hydration`

Additional namespaces may emerge later, but the early surface should remain deliberately small.

### 7.2 `Component.use(...)`

Canonical composition API for v0.1.

Expected role:

- compose behavior,
- attach reusable capabilities,
- keep component authoring explicit and plain-TypeScript friendly.

### 7.3 `Html.live(atom, render)`

Initial reactive bridge between Atom and Loom rendering.

Expected role:

- subscribe to Atom-driven changes,
- convert current reactive state into declarative HTML/component output,
- integrate with runtime update semantics.

### 7.4 `Html.hydrate(Hydration.strategy)`

Primary hydration helper for marking server-rendered content as hydratable under a chosen strategy.

Expected role:

- expose a visible hydration declaration in userland,
- map to attribute-based hydration markers,
- coordinate with client runtime bootstrap behavior.

### 7.5 `Html.on(...)`

Must support both:

1. a simple Effect form for common event handlers,
2. a contextual form providing `{ event, target, runtime }`.

This dual form gives the API a smooth beginner path without blocking advanced runtime-aware use cases.

---

## 8. Testing Strategy

Loom should adopt a testing culture inspired by the Effect repository.

### 8.1 Required test categories

- **Runtime tests** for rendering, events, SSR, and hydration behavior.
- **dtslint/type tests** for public API correctness and inference behavior.
- **Explicit assertions** instead of vague snapshots as the default confidence mechanism.
- **Regression tests** for any bug fixed in rendering, hydration, or event/runtime interaction.

### 8.2 Testing priorities

Highest-value early coverage areas:

1. `Component.use(...)` composition semantics
2. `Html.live(atom, render)` update behavior
3. `Html.on(...)` simple and contextual forms
4. SSR output stability
5. Opt-in hydration boundary detection and client activation
6. Package-level type surface for namespace-style modules

### 8.3 Testing philosophy

- Prefer precise assertions over broad snapshots.
- When a runtime edge case is discovered, add a regression test immediately.
- Type-level behavior is part of the public contract and must be tested, not assumed.

---

## 9. Open Questions

- What exact neutral AST node taxonomy gives enough renderer flexibility without over-engineering v0.1?
- Which hydration strategies should be first-class in `Hydration.strategy` at launch?
- How much runtime context should be exposed through `{ event, target, runtime }` before it becomes too leaky?
- Should `@effectify/loom-vite` own only plugin wiring, or also recommended project scaffolding conventions?
- What minimum router primitives are required for `@effectify/loom-router` to feel first-class from day one?

---

## 10. Summary

This RFC locks the foundational direction for `@effectify/loom`: a plain-TypeScript, Effect-native UI system built on a neutral AST, Atom-based reactivity, a web-first renderer, selective SSR hydration, and a disciplined package topology. The public API stays small and namespace-oriented; the internal architecture keeps enough separation to support future evolution without destabilizing the initial developer experience.
