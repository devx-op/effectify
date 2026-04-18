# PRD: @effectify/loom

**Status**: Draft\
**Initiative**: `@effectify/loom`\
**Document Type**: Product Requirements Document

---

## 1. Summary

`@effectify/loom` is a new Effect-native UI initiative for building web interfaces with plain TypeScript, a neutral AST, and Atom-based reactivity from the local Effect v4 beta reference. The public programming model centers on **Component** as the core concept, while the internal implementation stays renderer-agnostic through a neutral AST and internal runtime boundaries.

The v1 product direction is **web-first**, with **SSR + hydration** available from the start, hydration enabled **opt-in by attribute**, and **Vite** as the default developer path. SSR deployments must also support **Nitro** as a first-class target. Routing is a separate package, but intentionally treated as a first-class companion rather than an afterthought.

---

## 2. Problem

Effectify has packages that integrate Effect with existing frameworks, but it does not yet offer a native UI runtime designed around Effect v4 patterns from the ground up.

Today, teams that want Effect-native UI development typically face one or more of these problems:

- They must adopt JSX/TSX even when they want a plain TypeScript API.
- Their UI model is tightly coupled to one renderer instead of a neutral internal representation.
- SSR and hydration are often framework-defined rather than library-defined.
- Reactive state models feel bolted on instead of foundational.
- Router support is either too coupled to the view layer or too external to feel cohesive.

The opportunity for `@effectify/loom` is to provide a coherent, Effect-first UI system with a small public surface, clear package story, and predictable SSR/hydration model.

---

## 3. Target Users

### Primary users

- Effect developers who want a UI stack designed around Effect v4 patterns.
- TypeScript developers who prefer explicit APIs over JSX/TSX syntax.
- Full-stack teams that need SSR from day one and want hydration to be intentional rather than automatic.

### Secondary users

- Library authors building higher-level abstractions on top of a stable Component model.
- Teams targeting Nitro-based server runtimes.
- Teams that want routing to feel official without hard-wiring it into the main package.

---

## 4. Product Goals

### Goal 1: Establish a clear public identity

The package family must ship under the **`@effectify/loom`** brand, with **Component** as the primary public concept.

### Goal 2: Provide an Effect-native reactive foundation

Atom from the local Effect v4 beta reference must be the reactive primitive and an **obligatory peer dependency**, so the reactive story is consistent with the broader Effect direction.

### Goal 3: Deliver a plain TypeScript authoring model

The public API must avoid JSX/TSX entirely in v0/v1. Authoring should be possible with plain TypeScript modules and namespace-style APIs.

### Goal 4: Ship web-first rendering with SSR + hydration in v1

The first renderer must target the web, while supporting server-side rendering and client hydration in the first public release line.

### Goal 5: Make hydration explicit

Hydration must be opt-in by attribute so teams can mix static SSR output with selectively live islands.

### Goal 6: Keep the package story simple

Public packages for v0/v1 are:

- `@effectify/loom`
- `@effectify/loom-router`
- `@effectify/loom-vite`
- `@effectify/loom-nitro`

Internal monorepo packages exist for architecture and composition, but **`core`** and **`runtime`** are not public npm packages in v0/v1.

### Goal 7: Create a strong quality bar early

The initiative must adopt a testing culture inspired by the Effect repo: runtime tests, dtslint/type tests, explicit assertions, and regression tests as first-class deliverables.

---

## 5. Scope

### In scope for v0/v1

- A public `@effectify/loom` package with namespace-style modules.
- **Component** as the central public abstraction.
- Neutral AST as the internal model.
- Web-first rendering.
- SSR + hydration in v1.
- Attribute-based opt-in hydration.
- Vite as the default tooling and local development path.
- Nitro as a supported SSR target.
- A separate but first-class router package.
- Initial API direction including:
  - `Component.use(...)`
  - `Html.live(atom, render)`
  - `Html.hydrate(Hydration.strategy)`
  - `Html.on(...)` supporting both simple and contextual forms
- Internal monorepo layout under `packages/loom/{core,runtime,web,router,vite,nitro}`.
- Effect-style code organization and JSDoc conventions.
- A test strategy that includes runtime and type-level verification.

### Out of scope for v0/v1

- JSX or TSX authoring.
- Public npm publication of `@effectify/loom-core` or `@effectify/loom-runtime`.
- Non-web primary renderers.
- An all-in-one monolithic package that bundles router, Vite integration, and Nitro integration together.
- Automatic hydration of every server-rendered node.
- Framework-specific compatibility layers beyond the defined public topology.

---

## 6. Non-Goals

These are intentionally NOT goals for the first line of the initiative:

- Replacing every existing UI framework abstraction in one release.
- Solving native/mobile rendering in v1.
- Providing a fully integrated router inside the base package.
- Hiding Atom behind a proprietary reactive abstraction.
- Optimizing for JSX ergonomics.

---

## 7. Product Principles

- **Effect-first, not framework-first**: the design should reflect Effect patterns before ecosystem fashion.
- **Explicit over magical**: hydration, runtime context, and event behavior should be understandable from the API.
- **Small public surface, strong internals**: expose simple concepts, keep architectural complexity internal.
- **Web first, not web only forever**: the internal AST stays neutral so future renderers remain possible.
- **Tooling should lower adoption cost**: Vite must be the default path because the first experience matters.

---

## 8. Success Criteria

### Product success

- Developers can explain the package family in one sentence: base package, router, Vite integration, Nitro integration.
- Developers can build a server-rendered web page with selective hydration using only documented public APIs.
- Developers can compose behavior through `Component.use(...)` without needing JSX/TSX.
- The router feels official and cohesive while remaining independently installable.

### Technical success

- The internal architecture preserves a neutral AST boundary.
- Atom is used as the reactive foundation without introducing a competing reactive model.
- Hydration works only where opt-in attributes are present.
- Runtime tests and type tests cover the initial API surface.
- Regression tests exist for SSR/hydration and event handling edge cases.

---

## 9. Milestone Roadmap

### Phase 0: Architecture and package foundation

- Lock package topology and monorepo layout.
- Define public namespace-style module boundaries.
- Establish Effect-style code organization and JSDoc conventions.
- Define the neutral AST and internal runtime seams.

### Phase 1: Core web rendering API

- Deliver `@effectify/loom` with initial `Component` and `Html` APIs.
- Implement web renderer on top of internal core/runtime packages.
- Prove `Html.live(atom, render)` for fine-grained reactivity.
- Define event binding via `Html.on(...)`.

### Phase 2: SSR + hydration

- Deliver SSR rendering in the web-first stack.
- Add attribute-driven opt-in hydration.
- Stabilize `Html.hydrate(Hydration.strategy)`.
- Add regression coverage for mismatches and partial hydration boundaries.

### Phase 3: First-class integrations

- Deliver `@effectify/loom-vite` as the default tooling path.
- Deliver `@effectify/loom-nitro` as a supported SSR target.
- Deliver `@effectify/loom-router` with a cohesive but separate package boundary.

---

## 10. Risks and Mitigations

### Risk: Plain TypeScript API may feel unfamiliar

**Why it matters**: many UI developers expect JSX/TSX by default.\
**Mitigation**: keep the public API crisp, readable, and strongly documented with examples.

### Risk: SSR + selective hydration complexity

**Why it matters**: hydration bugs are expensive and subtle.\
**Mitigation**: make hydration opt-in by attribute, keep strategy APIs explicit, and invest early in regression coverage.

### Risk: Router separation may feel fragmented

**Why it matters**: too much separation can damage perceived cohesion.\
**Mitigation**: position router as separate but first-class, with aligned conventions and docs.

### Risk: Atom dependency creates adoption friction

**Why it matters**: mandatory peer dependencies must be justified.\
**Mitigation**: treat Atom as a deliberate architectural contract and document why it is foundational rather than optional.

### Risk: Internal/public package boundaries drift over time

**Why it matters**: accidentally exposing `core` or `runtime` would weaken the architecture.\
**Mitigation**: document the package topology clearly and reinforce it through repository structure and release policy.

---

## 11. Open Product Questions

- What is the minimum “hello world” experience that proves plain TypeScript ergonomics are viable for new users?
- Which hydration strategies should be officially named in v0.1 versus left internal until more runtime evidence exists?
- How much router capability belongs in the first public router release versus later incremental milestones?
- What examples should ship first to prove the Vite and Nitro stories are both credible?

---

## 12. Conclusion

`@effectify/loom` is the foundation for an Effect-native UI product line: plain TypeScript authoring, a neutral AST internally, Atom-based reactivity, web-first rendering, and explicit SSR/hydration behavior. The product strategy is to keep the public model small and teachable while building serious internal architecture for long-term growth.
