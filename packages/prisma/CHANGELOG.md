## 2.0.0-alpha.2 (2026-04-24)

### 🚀 Features

- **hatchet:** complete Effect-first Hatchet integration slices

### ❤️ Thank You

- Andres David Jimenez @kattsushi

## 2.0.0-alpha.1 (2026-03-27)

This was a version bump only for @effectify/prisma to align it with other projects, there were no code changes.

## 2.0.0-alpha.0 (2026-03-27)

### 🚀 Features

- ⚠️ initial Effect v4 beta migration setup
- **prisma:** add test executor with prisma:generate dependency
- **prisma:** integrate schema generation and remove prisma-effect-kysely dependency
- add @effect/experimental dependency and update Prisma integration
- major schema change from auto-increment to UUID strings
- implement complete Prisma CLI with Effect TypeScript integration

### 🩹 Fixes

- **prisma:** migration fix with better api v4 impl
- **prisma:** update dependencies and optimize package.json
- **prisma:** update features documentation
- **prisma:** revert documentation change testing release pipeline
- **prisma:** update documentation to trigger release pipeline
- **prisma:** correct type definitions and tsconfig paths for self-referencing imports
- **auth, prisma, app:** redirect unauthenticated users and fix build config
- ensure consistent build output structure (flattened dist)
- **prisma:** resolve type errors in generators and apply biome ignore

### ⚠️ Breaking Changes

- initial Effect v4 beta migration setup
  Effect dependencies updated to v4 beta

### ❤️ Thank You

- Andres David Jimenez @kattsushi
- Andres David Jimenez Sulbaran @kattsushi
- Andres Jimenez @kattsushi

# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] - 2026-01-30

### Fixes

- Fixed CHANGELOG.md formatting and structure
- Added missing changelog entry for version 1.0.1

## [1.0.0] - 2026-01-30

### Major Changes

- **BREAKING**: Changed database schema from auto-increment integers to UUID strings for primary keys
- **BREAKING**: Updated Prisma schema to use `String @id @default(uuid())` instead of `Int @id @default(autoincrement())`

### Features

- Added proper CLI termination with exit code 0 for CI/CD pipeline compatibility
- Implemented dynamic UUID generation using Node.js native `crypto.randomUUID()`
- Added proper stream closure in prisma command handler

### Fixes

- Fixed type mismatches between Prisma's Int IDs and Effect's branded TodoId string type
- Replaced hardcoded UUIDs with dynamically generated ones in tests and application code
- Resolved CLI indefinite hang issue by properly closing event streams
- Fixed linter errors by using native Node.js utilities instead of external uuid library

### Technical Improvements

- Updated test suite to use reusable generated UUIDs instead of hardcoded values
- Improved test maintainability with centralized UUID generation
- Enhanced CI/CD compatibility with proper process termination
