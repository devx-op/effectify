# Delta for App Builder Run Store Recovery

## MODIFIED Requirements

### Requirement: Truthful Optimistic Commit

The system MUST require matching scoped workspace ownership authority for every commit, validate the authoritative tail, and reject missing or wrong ownership plus revision, predecessor, payload, or request-identity conflicts. Success SHALL require restrictive temporary creation, complete write, file durability, immutable no-replace publication, and directory durability. Unsupported or indeterminate stages MUST fail closed, never claim cross-process locking.

(Previously: Commits validated optimistic journal conflicts but did not require workspace ownership.)

#### Scenario: Tail conflict

- GIVEN an expected revision or digest differs
- WHEN an owned commit is requested
- THEN a typed conflict MUST result without segment replacement

#### Scenario: Missing ownership

- GIVEN no matching scoped ownership authority
- WHEN commit is requested
- THEN a typed authorization failure MUST result and nothing is written

#### Scenario: Interrupted commit

- GIVEN any durable stage fails or is interrupted
- WHEN the caller observes it
- THEN it MUST receive truthful typed status, never assumed success

### Requirement: Non-Executable Handoff and Retention

A `ResumeCandidate` MUST be non-executable and name unmet lock and executor/idempotency authorities. Evidence MUST remain through closure; explicit terminal cleanup MAY remove only validated terminal state and MUST require matching scoped workspace ownership authority. Recovery MUST NOT mutate workspaces, execute, lock, repair, salvage, migrate, quarantine, clean implicitly, or require a database.

(Previously: Explicit cleanup was guarded by terminal validity but had no ownership requirement.)

#### Scenario: Candidate handoff

- GIVEN valid interruption evidence without successor authority
- WHEN recovery produces a candidate
- THEN unmet authorities MUST remain explicit

#### Scenario: Cleanup guard

- GIVEN nonterminal, invalid, ambiguous, or unowned state
- WHEN cleanup is requested
- THEN all evidence MUST be preserved

#### Scenario: Owned cleanup

- GIVEN validated terminal state and matching scoped authority
- WHEN explicit cleanup is requested
- THEN it MAY remove only the validated terminal state
