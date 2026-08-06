# Delta for App Builder Nested Workspace E2E

## ADDED Requirements

### Requirement: Isolated Nested Nx Verification

Authoritative E2E MUST create the generated workspace under an OS-temporary location outside repository and root workspace globs. It MUST isolate Nx daemon, cache, workspace data, pnpm store, and registry state; use local package distribution; and execute nested graph, tests, typecheck, build, Todo CLI behavior, regeneration, and zero-diff verification.

#### Scenario: Run the isolated Golden proof

- GIVEN locally distributed pinned packages and an OS-temporary workspace
- WHEN the E2E suite runs
- THEN all declared nested checks and Todo execution MUST pass without root graph discovery

#### Scenario: Prove regeneration identity

- GIVEN a successful first generation in the isolated workspace
- WHEN the same request regenerates it
- THEN its generated-tree diff MUST be zero

### Requirement: Isolation Failure Cleanup

E2E setup and teardown MUST clean isolated temporary workspace, registry, package-store, and Nx state on success, failure, or interruption. Cleanup failure MUST be reported and MUST NOT pollute the root Nx graph or pnpm workspace state.

#### Scenario: Clean up after verification failure

- GIVEN a nested verification command fails
- WHEN the E2E run terminates
- THEN isolated resources MUST be removed or a cleanup failure MUST be reported

#### Scenario: Prevent root pollution

- GIVEN a nested workspace is created or cleanup is interrupted
- WHEN the root Nx graph is inspected
- THEN no generated nested project MUST be discovered
