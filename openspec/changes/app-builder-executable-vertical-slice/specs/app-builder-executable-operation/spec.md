# App Builder Executable Operation Specification

## Purpose

Define the approved, auditable draft-to-execution command. This capability supersedes the implementation intent, but not the historical evidence, of `app-builder-create-operation`.

## Requirements

### Requirement: Deterministic Approved Invocation

The system MUST expose a deterministic, non-interactive Nx command that accepts a caller-selected dedicated persistent workspace. After project dependencies and the integrated helper are installed, the workflow MUST complete fully offline and MUST NOT require remote services or transports at runtime. It MUST require `--approve`; without that flag it MUST create no journal entry and MUST NOT mutate the workspace.

#### Scenario: Approved invocation

- GIVEN dependencies and the integrated helper are installed, a dedicated persistent workspace, and a durable draft
- WHEN network access is unavailable and the maintainer runs the command with `--approve`
- THEN the command uses that workspace and completes the defined workflow without a remote service or transport

#### Scenario: Approval omitted

- GIVEN a dedicated persistent workspace and a durable draft
- WHEN the maintainer omits `--approve`
- THEN the command fails before journal or workspace mutation

### Requirement: Durable Revision Handoff

The system MUST durably persist and reload the draft, retain local unjournaled Draft r0, durably persist r1 through r3, and hand the executor the exact durable Ready r3 tail. `RunExecutor` SHALL exclusively own r4 and later revisions and its cleanup behavior.

#### Scenario: Ready handoff

- GIVEN a reloadable durable draft and an approved invocation
- WHEN preparation completes successfully
- THEN r1–r3 are durable and the executor receives exact Ready r3

#### Scenario: Preparation cannot persist

- GIVEN preparation fails before Ready r3 is durable
- WHEN the command terminates
- THEN it does not invoke the executor or fabricate a Ready handoff

### Requirement: Immutable Generated Output

The approved workflow MUST create `generated.txt` exactly once through no-replace semantics. Its contents MUST equal the fixed, documented expected demo payload byte-for-byte, and it MUST NOT replace an existing `generated.txt`.

#### Scenario: First generated output

- GIVEN no `generated.txt` exists in the selected workspace
- WHEN an approved workflow succeeds
- THEN exactly one immutable `generated.txt` contains the expected payload byte-for-byte

#### Scenario: Independent deterministic outputs

- GIVEN two clean dedicated persistent workspaces and the same durable draft
- WHEN each approved offline workflow succeeds
- THEN both `generated.txt` files equal the same expected payload byte-for-byte

#### Scenario: Existing generated output

- GIVEN `generated.txt` already exists in the selected workspace
- WHEN an approved workflow runs
- THEN it fails visibly and preserves the pre-existing file

### Requirement: Truthful Exported Evidence

The system MUST export a readable success report naming r1, r2, and r3 with their durable digests; executor-owned r4 with its digest; the terminal outcome with its revision and digest; and the `generated.txt` digest. The report MUST remain readable after executor cleanup and MUST NOT weaken executor-owned cleanup.

#### Scenario: Successful cleanup with evidence

- GIVEN the executor completes and performs its required cleanup
- WHEN the command exports success evidence
- THEN the report remains readable and names r1–r3, executor-owned r4, terminal outcome, and their required digests

### Requirement: Recoverable Failure and Lock Safety

On intermediate failure, the system MUST preserve safe recoverable evidence and export a truthful failure report without claiming success. A lock or reacquisition conflict MUST fail closed and MUST NOT invoke the protected callback.

#### Scenario: Intermediate failure

- GIVEN failure occurs after durable preparation begins but before success
- WHEN the command handles the failure
- THEN recoverable evidence remains and the exported report identifies failure

#### Scenario: Lock reacquisition conflict

- GIVEN lock ownership cannot be acquired or safely reacquired
- WHEN the workflow reaches the protected callback boundary
- THEN it fails closed and invokes no callback

## Explicit Non-Goals

Generic resolver or approval services, advanced stale recovery, prompts, JSON protocol, Windows, generators, registries, plugins, and broad secret/configuration matrices are deferred.
