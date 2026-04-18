# Loom package surface

This directory contains the Loom package family for the `loom-web-runtime` change.

## Supported public package surface

- `@effectify/loom` — base web runtime surface
- `@effectify/loom-router` — router companion package
- `@effectify/loom-vite` — Vite integration package
- `@effectify/loom-nitro` — Nitro integration package

## Internal-only packages

- `@effectify/loom-core` — neutral AST and composition contracts
- `@effectify/loom-runtime` — hydration, event, and runtime execution internals

`@effectify/loom-core` and `@effectify/loom-runtime` stay internal-only even though the workspace uses them directly. They are not part of the public package surface and must remain private workspace implementation details.
