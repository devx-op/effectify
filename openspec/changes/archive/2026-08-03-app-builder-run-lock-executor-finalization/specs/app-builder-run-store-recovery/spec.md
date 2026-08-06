# Delta for App Builder Run Store Recovery

## MODIFIED Requirements

### Requirement: Non-Executable Handoff and Retention

A `ResumeCandidate` MUST be non-executable and name unmet lock and executor/idempotency authorities. Evidence MUST remain through closure. Under matching live ownership, cleanup MAY prepare only validated terminal evidence for later deletion; it MUST delete only after durable lock release and only if the prepared terminal evidence remains unchanged. Recovery MUST NOT mutate workspaces, execute, lock, repair, salvage, migrate, quarantine, clean implicitly, use tombstone/rename recovery, or expose public cleanup authority. It MUST NOT require a database.

(Previously: explicit cleanup could remove validated terminal state without a release-before-delete proof.)

#### Scenario: Candidate handoff

- GIVEN valid interruption evidence without successor authority
- WHEN recovery produces a candidate
- THEN unmet authorities MUST remain explicit

#### Scenario: Cleanup guard

- GIVEN nonterminal, invalid, or ambiguous state
- WHEN cleanup is requested
- THEN all evidence MUST be preserved

#### Scenario: Release failure

- GIVEN prepared terminal evidence and a failed or interrupted lock release
- WHEN finalization ends
- THEN deletion MUST NOT occur and evidence MUST remain

#### Scenario: Changed terminal evidence

- GIVEN release succeeds and terminal evidence changes before deletion
- WHEN deletion compares its preparation
- THEN it MUST preserve evidence and report a closed failure

### Requirement: Strict TDD Evidence Matrix

Deterministic Nx/pnpm tests MUST cover every crash boundary, validation class, replay law, path/permission defense, recovery outcome, cleanup guard, cancellation proof, and release-before-delete ordering without failed-recovery mutation. Reproducible RED, GREEN, TRIANGULATE, and SAFETY NET evidence MUST distinguish interruption-only settlement, mixed/indeterminate outcomes, release failure, cleanup failure, and changed evidence. Coverage MUST include `run-executor.ts`, `workspace-lock.ts`, `cleanup.ts`, and every corrected helper without weakening existing thresholds. The follow-up SHOULD target no more than 400 changed lines; an overage MUST be recorded and MUST NOT omit required proof.

(Previously: the matrix did not require finalization triangulation, corrected-path coverage, or the bounded delivery target.)

#### Scenario: Crash matrix

- GIVEN each durable commit boundary
- WHEN interruption is injected
- THEN recovery MUST yield its specified truthful outcome

#### Scenario: Finalization proof matrix

- GIVEN the corrected cancellation, release, and deletion paths
- WHEN deterministic RED/GREEN/TRIANGULATE/SAFETY NET and coverage checks run
- THEN every corrected path and outcome distinction MUST be proven
