## Unreleased

### Breaking

- Replace the alpha workflow DSL with `Task.make` and the scoped `Hatchet` service. `workflow`, standalone `task`, `registerWorkflow`, and `registerWorkflowWithConfig` have no compatibility adapter.
- Add typed scheduling, storage-only in-memory cron CRUD, and explicit run cancellation. Remote schedules and crons require explicit operator cleanup on rollback; emitted runs require explicit cancellation.
- Remove the legacy `clients`, `core`, `logging`, and `schema` source trees and their deep imports. Remove the mock-client and mock-context testing helpers; `@effectify/hatchet/testing` now exports only `layerInMemory`, with no compatibility aliases.

## 0.1.0-alpha.5 (2026-07-12)

This was a version bump only for @effectify/hatchet to align it with other projects, there were no code changes.

## 0.1.0-alpha.4 (2026-07-11)

This was a version bump only for @effectify/hatchet to align it with other projects, there were no code changes.

## 0.1.0-alpha.3 (2026-04-27)

### 🚀 Features

- **effect:** upgrade beta57 and migrate Context services

### ❤️ Thank You

- Andres David Jimenez @kattsushi

## 0.1.0-alpha.2 (2026-04-24)

### 🚀 Features

- **hatchet:** complete Effect-first Hatchet integration slices

### ❤️ Thank You

- Andres David Jimenez @kattsushi
