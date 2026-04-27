## 1.0.0-alpha.3 (2026-04-27)

This was a version bump only for @effectify/solid-query to align it with other projects, there were no code changes.

## 1.0.0-alpha.2 (2026-04-24)

This was a version bump only for @effectify/solid-query to align it with other projects, there were no code changes.

## 1.0.0-alpha.1 (2026-03-27)

This was a version bump only for @effectify/solid-query to align it with other projects, there were no code changes.

## 1.0.0-alpha.0 (2026-03-24)

### 🚀 Features

- ⚠️ **workspace:** migrate entire monorepo to Effect v4 beta
- ⚠️ initial Effect v4 beta migration setup
- **solid-query:** test isolated package change for release workflow
- **solid-query:** add release workflow test comment
- add manual publishing scripts with nx affected
- add CI/CD workflows and local testing setup
- migrate from Bun to pnpm with complete build system overhaul

### 🩹 Fixes

- **package:** add repository.url for npm provenance
- **query-packages:** restore working v4 API implementation and trigger beta release
- **query-packages:** migrate Stream.catch and Effect.forkDetach to v4 APIs
- **solid-query:** update dependencies and classify as peerDependencies
- update package entry points to match build output structure (dist/src)
- ensure consistent build output structure (flattened dist)
- correct package entry points to point to dist instead of dist/src
- **release:** improve npm scope authentication
- **release:** configure @effectify scope in npmrc
- **release:** use nx run-many instead of nx build
- **release:** remove quotes from --projects flag
- **release:** use bash parameter expansion for reliable whitespace trimming
- **release:** use sed instead of xargs for whitespace trimming
- **release:** configure independent releases and trim whitespace
- **release:** use correct --projects syntax for nx release
- **release:** move typecheck after build to resolve dependency issues
- **release:** convert space-separated projects to comma-separated for Nx
- **release:** only publish affected projects instead of all release group
- **release:** add automaticFromRef for changelog generation
- **release:** include all packages in preVersionCommand and update CI triggers
- **solid-query:** add another test change for release workflow
- **solid-query:** add test comment for conventional commits patch versioning
- resolve React types conflicts and improve CI workflow
- update CI workflow to use correct base branch for affected detection

### ⚠️ Breaking Changes

- **workspace:** migrate entire monorepo to Effect v4 beta
  All packages now use Effect v4 beta
  Core packages now building:
  - @effectify/react-query ✅
  - @effectify/solid-query ✅
  - @effectify/shared-domain ✅
  - @effectify/chat-domain ✅
- initial Effect v4 beta migration setup
  Effect dependencies updated to v4 beta

### ❤️ Thank You

- Andres David Jimenez @kattsushi
- Andres David Jimenez Sulbaran @kattsushi
- Andres Jimenez

## 0.4.7 (2026-01-02)

### 🩹 Fixes

- update package entry points to match build output structure (dist/src)

### ❤️ Thank You

- Andres Jimenez

## 0.4.6 (2026-01-02)

### 🩹 Fixes

- ensure consistent build output structure (flattened dist)

### ❤️ Thank You

- Andres Jimenez

## 0.4.5 (2026-01-02)

### 🩹 Fixes

- correct package entry points to point to dist instead of dist/src

### ❤️ Thank You

- Andres Jimenez

## 0.3.1 (2026-01-02)

This was a version bump only for @effectify/solid-query to align it with other projects, there were no code changes.

## 0.3.0 (2025-12-19)

### 🚀 Features

- **solid-query:** test isolated package change for release workflow
- **solid-query:** add release workflow test comment
- add manual publishing scripts with nx affected
- add CI/CD workflows and local testing setup
- migrate from Bun to pnpm with complete build system overhaul

### 🩹 Fixes

- **release:** improve npm scope authentication
- **release:** configure @effectify scope in npmrc
- **release:** use nx run-many instead of nx build
- **release:** remove quotes from --projects flag
- **release:** use bash parameter expansion for reliable whitespace trimming
- **release:** use sed instead of xargs for whitespace trimming
- **release:** configure independent releases and trim whitespace
- **release:** use correct --projects syntax for nx release
- **release:** move typecheck after build to resolve dependency issues
- **release:** convert space-separated projects to comma-separated for Nx
- **release:** only publish affected projects instead of all release group
- **release:** add automaticFromRef for changelog generation
- **release:** include all packages in preVersionCommand and update CI triggers
- **solid-query:** add another test change for release workflow
- **solid-query:** add test comment for conventional commits patch versioning

### ❤️ Thank You

- Andres David Jimenez
- Andres Jimenez

## 0.2.0 (2025-10-11)

### 🚀 Features

- **solid-query:** test isolated package change for release workflow
- **solid-query:** add release workflow test comment
- add manual publishing scripts with nx affected
- add CI/CD workflows and local testing setup
- migrate from Bun to pnpm with complete build system overhaul

### 🩹 Fixes

- **release:** improve npm scope authentication
- **release:** configure @effectify scope in npmrc
- **release:** use nx run-many instead of nx build
- **release:** remove quotes from --projects flag
- **release:** use bash parameter expansion for reliable whitespace trimming
- **release:** use sed instead of xargs for whitespace trimming
- **release:** configure independent releases and trim whitespace
- **release:** use correct --projects syntax for nx release
- **release:** move typecheck after build to resolve dependency issues
- **release:** convert space-separated projects to comma-separated for Nx
- **release:** only publish affected projects instead of all release group
- **release:** add automaticFromRef for changelog generation
- **release:** include all packages in preVersionCommand and update CI triggers
- **solid-query:** add another test change for release workflow
- **solid-query:** add test comment for conventional commits patch versioning

### ❤️ Thank You

- Andres David Jimenez
- Andres Jimenez

## 0.1.0 (2025-10-07)

### 🚀 Features

- add manual publishing scripts with nx affected
- add CI/CD workflows and local testing setup
- migrate from Bun to pnpm with complete build system overhaul

### 🩹 Fixes

- **release:** improve npm scope authentication
- **release:** configure @effectify scope in npmrc
- **release:** use nx run-many instead of nx build
- **release:** remove quotes from --projects flag
- **release:** use bash parameter expansion for reliable whitespace trimming
- **release:** use sed instead of xargs for whitespace trimming
- **release:** configure independent releases and trim whitespace
- **release:** use correct --projects syntax for nx release
- **release:** move typecheck after build to resolve dependency issues
- **release:** convert space-separated projects to comma-separated for Nx
- **release:** only publish affected projects instead of all release group
- **release:** add automaticFromRef for changelog generation
- **release:** include all packages in preVersionCommand and update CI triggers
- **solid-query:** add another test change for release workflow
- **solid-query:** add test comment for conventional commits patch versioning

### ❤️ Thank You

- Andres David Jimenez
- Andres Jimenez

## 0.0.2 (2025-06-07)

This was a version bump only for @effectify/solid-query to align it with other projects, there were no code changes.
