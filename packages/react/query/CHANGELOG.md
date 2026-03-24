# null (2026-03-24)

### 🚀 Features

- ⚠️ **workspace:** migrate entire monorepo to Effect v4 beta
- ⚠️ initial Effect v4 beta migration setup
- add manual publishing scripts with nx affected
- migrate from Bun to pnpm with complete build system overhaul

### 🩹 Fixes

- **package:** add repository.url for npm provenance
- **query-packages:** restore working v4 API implementation and trigger beta release
- **query-packages:** migrate Stream.catch and Effect.forkDetach to v4 APIs
- **solid-query:** update dependencies and classify as peerDependencies
- update package entry points to match build output structure (dist/src)
- ensure consistent build output structure (flattened dist)
- resolve React types conflicts and improve CI workflow

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

## 0.0.2 (2025-06-07)

This was a version bump only for @effectify/solid-query to align it with other projects, there were no code changes.
