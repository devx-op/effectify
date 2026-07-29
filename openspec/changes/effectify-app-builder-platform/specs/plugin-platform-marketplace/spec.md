# Plugin Platform and Marketplace Specification

## Purpose

Define governed plugin execution, compatibility, supply-chain evidence, and registry lifecycle.

## Requirements

### Requirement: Plugin parity and compatibility

All framework, transport, persistence, auth, UI, workflow, and deployment integrations MUST be plugins. Official/community plugins SHALL share governed contracts; official status grants no bypass. v1 authoring MUST use modern TypeScript and compiled ESM distribution with declarations, source maps, exports, and SDK peer contract; production MUST NOT run raw TypeScript. CLI/workers use Node.js LTS; Bun MAY be a package manager but MUST NOT run workers. Plugins declare SemVer compatibility, capabilities, topology, and permissions; resolution MAY recommend but MUST NOT alter them.

#### Scenario: Resolve a compatible plugin set

- GIVEN pinned plugin requirements and a signed registry snapshot
- WHEN compatibility is evaluated
- THEN the result MUST identify supported, experimental, incompatible, unavailable, or pending-evidence states with reasons

#### Scenario: Reject an unsupported plugin runtime

- GIVEN plugin execution is requested on Bun or from raw TypeScript
- WHEN the worker is started
- THEN it MUST reject execution before loading plugin code

### Requirement: Isolated, deny-by-default execution

Plugins MUST execute out of process through a broker denying ungranted workspace, process, network, environment, secret, and telemetry operations. Secrets require per-use consent; expansion requires renewed approval. Timeout, interruption, limits, and failures MUST be structured and testable with simulated brokers and virtual-tree review.

#### Scenario: Deny an undeclared capability

- GIVEN a plugin requests an unapproved host, path, command, variable, or secret
- WHEN the worker invokes the broker
- THEN the operation MUST be denied without exposing the protected value

#### Scenario: Review expanded permissions

- GIVEN an update expands permissions
- WHEN the update is evaluated
- THEN it MUST enter review and cannot auto-apply

#### Scenario: Interrupt a brokered plugin

- GIVEN a plugin exceeds its declared execution limit or is interrupted
- WHEN the worker is terminated
- THEN it MUST return a structured failure without unapproved workspace writes

#### Scenario: Consent to one secret use

- GIVEN a plugin requests an approved secret identity
- WHEN the user declines per-use consent
- THEN the broker MUST deny that access while preserving other granted capabilities

### Requirement: Validated registry authority

Discovery MUST query the `effectify-plugin` topic daily; results are candidates only. Candidates MUST enter `pending-validation`, targeted for validation within one hour. This is not a publication SLA: publication still requires validation and moderation. Validation covers identity, manifest, immutable release/digest, integrity, compatibility, capabilities, permissions, format, and installability. Only the validated signed registry may authorize publication or installation.

#### Scenario: Validate a discovered candidate

- GIVEN daily discovery finds a repository
- WHEN validation succeeds within the one-hour target
- THEN a signed registry snapshot MAY mark its immutable release published

#### Scenario: Handle failed validation

- GIVEN validation fails or a sensitive change is detected
- WHEN the status is recorded
- THEN the entry MUST remain visible as rejected, quarantined, or pending-review and MUST NOT be installable

### Requirement: Immutable installation and lifecycle

Installation MUST pin release and digest, disclose permission/topology/file impact, and require approval. Releases MAY auto-publish/update only with continuous identity, validation/policy success, and no expansion. Registry state MUST distinguish discovered, pending-validation, pending-review, published, rejected, quarantined, deprecated, and revoked.

#### Scenario: Install a published plugin

- GIVEN a published, compatible immutable release
- WHEN the user approves its disclosed impact
- THEN installation MUST persist the exact release, digest, and provenance

### Requirement: Revocation without historical mutation

Registry snapshots MUST remain immutable. New signed snapshots MAY revoke/quarantine without changing old snapshots or blueprints. Execution MUST live-check pins and block revoked dependencies by default.

#### Scenario: Block a revoked blueprint dependency

- GIVEN a valid historical blueprint pins a now-revoked plugin
- WHEN local execution resolves it
- THEN execution MUST stop with the revocation evidence while preserving blueprint history
