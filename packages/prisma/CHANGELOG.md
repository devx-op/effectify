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
