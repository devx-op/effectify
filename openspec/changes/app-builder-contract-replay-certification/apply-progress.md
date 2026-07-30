# Apply Progress: App Builder Contract Replay Certification

## Status

All eight package-scoped tasks remain complete. The premature
`app-builder-contracts-browser-fixture` and
`app-builder-contracts-browser-fixture-e2e` Nx applications were removed at the
maintainer's request. No new SDD phase, native review action, commit, or push was
performed.

## Completed Package Scope

- [x] Digest algorithm/value references and malformed-metadata regressions.
- [x] Closed immutable passive records with hostile-input and ordering proofs.
- [x] Canonical replay material with external digest claims and no hashing.
- [x] Explicit fixed compatibility declarations and deterministic certification.
- [x] Root export allowlist, namespaces, type-channel proofs, and import firewall.
- [x] Public ESM package metadata, package-local build output, coverage target, and release registration.
- [x] README import/API, range, canonicalization, and digest-ownership guidance.
- [x] Package test, typecheck, lint, build, coverage, and delivery gates.

## Corrective Transaction

- Deleted both fixture application trees and their resolved Nx projects.
- Removed the root workspace dependency that existed only to resolve the fixture application's bare package import.
- Removed browser/Cypress-specific planning, requirement, evidence, rollback, and verification claims.
- Preserved all replay, compatibility, public-package, type-proof, and package-test implementation.

## Current Verification

- `pnpm exec oxfmt packages/app-builder/contracts nx.json package.json pnpm-lock.yaml openspec/changes/app-builder-contract-replay-certification` — normalized 65 files.
- `pnpm nx run @effectify/app-builder-contracts:test --skip-nx-cache` — 23 files, 64 tests passed.
- `pnpm nx run @effectify/app-builder-contracts:typecheck --skip-nx-cache` — passed.
- `pnpm nx run @effectify/app-builder-contracts:lint --skip-nx-cache` — passed with 6 existing generic-variance warnings and 0 errors.

## Review State

Deleting the fixtures changes the previously reviewed candidate identity. The
prior verification/review lineage is not approval for this candidate; a fresh
native review must be started by the parent workflow.

## Rollback Boundary

Replay, compatibility, public exports, package metadata, package tests, and
documentation remain one child before declarations. The removed applications
are not part of that child and must not be restored without separate planning.
