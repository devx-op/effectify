# App Builder POSIX Durable Filesystem Specification

## Purpose

Define truthful durable filesystem behavior for the executable App Builder slice on macOS x64/arm64 and glibc Linux x64/arm64.

## Requirements

### Requirement: Handle-Relative No-Follow Durability

The system MUST perform protected workspace operations relative to validated directory handles and MUST reject symlink traversal. It MUST durably synchronize required file data and directory metadata before reporting committed success. A minimal, auditable integrated POSIX helper MUST provide any required platform behavior on macOS x64/arm64 and glibc Linux x64/arm64 without a manually installed external prerequisite.

#### Scenario: macOS x64/arm64 offline durable smoke

- GIVEN dependencies and the integrated helper are installed on macOS x64 or arm64
- WHEN the offline smoke run performs a protected durable write
- THEN it succeeds with handle-relative, no-follow semantics and private permissions

#### Scenario: glibc Linux x64/arm64 offline durable smoke

- GIVEN dependencies and the integrated helper are installed on glibc Linux x64 or arm64
- WHEN the offline smoke run performs a protected durable write
- THEN it succeeds with handle-relative, no-follow semantics and private permissions

#### Scenario: Symlinked protected path

- GIVEN a protected workspace component resolves through a symlink
- WHEN the adapter accesses that component
- THEN it fails closed without writing through the link

### Requirement: Private Sync and No-Replace Creation

The system MUST create protected artifacts and directories with private modes, MUST synchronize every required durable boundary, and MUST use no-replace creation where an artifact is immutable. It MUST NOT silently weaken these guarantees when a platform operation cannot be satisfied.

#### Scenario: Existing immutable output

- GIVEN the target immutable artifact already exists
- WHEN the adapter attempts no-replace creation
- THEN it fails visibly and leaves the existing artifact unchanged

#### Scenario: Unsatisfied platform primitive

- GIVEN the required no-follow, sync, or no-replace primitive cannot be applied
- WHEN the adapter receives the request
- THEN it fails closed without an unsafe path-based fallback

### Requirement: Platform CI Proof

The project MUST run real CI smoke jobs for macOS x64, macOS arm64, glibc Linux x64, and glibc Linux arm64 that exercise the installed helper and adapter without network access after dependency installation.

#### Scenario: CI matrix evidence

- GIVEN CI runs macOS x64, macOS arm64, glibc Linux x64, and glibc Linux arm64 jobs after dependencies are installed
- WHEN each job disables network-dependent execution and runs the smoke target
- THEN all four jobs publish a passing result for the real adapter path

## Explicit Non-Goals

Windows support, musl Linux, generic filesystem plugins, and broad configuration matrices are deferred.
