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

## Compatibility and advanced seams

- `Html` — compatibility-first low-level AST / SSR seam; prefer `View` + `Web` for new authoring
- `Diagnostics` — advanced runtime visibility helpers
- `Hydration` — advanced hydration helpers layered after the primary interactive path
- `Resumability` — advanced resumability helpers layered after the primary interactive path

## Internal-only packages

- `@effectify/loom-core` — neutral AST and composition contracts
- `@effectify/loom-runtime` — hydration, event, and runtime execution internals

`@effectify/loom-core` and `@effectify/loom-runtime` stay internal-only even though the workspace uses them directly. They are not part of the public package surface and must remain private workspace implementation details.
