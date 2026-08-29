# Protected Stable Promotion Specification

## Purpose

Define a protected, auditable promotion of the complete authorized beta matrix to exact stable versions through PREPARE, a reviewed protected pull request, structural beta suppression, and exact-SHA FINALIZE, while preserving prerelease artifacts and channel identity.

## Requirements

### Requirement: Collision correction precedes stable promotion

The system MUST correct the stale `@effectify/solid-query@0.5.12` collision by authorizing exactly one manual beta PREPARE exception: the singleton project `@effectify/solid-query`, positional `prepatch`, `--preid=beta`, disabled commit/tag/push/staging effects, exact output `0.5.13-beta.0`, and exactly `CHANGELOG.md` plus `packages/solid/query/package.json`. No caller-selectable version specifier or other subset is authorized. Its protected merge MUST be suppressed only for the exact `0.5.12-beta.0` to `0.5.13-beta.0` transition and those two paths.

The required order is implementation PR, corrective beta PREPARE/PR/FINALIZE, then seven-project stable PREPARE/PR/FINALIZE. Recovery MUST NOT move npm `latest` to the stale `0.5.12` tarball.

#### Scenario: Corrective beta is exact

- GIVEN the implementation PR has merged
- WHEN manual beta PREPARE selects only `@effectify/solid-query`
- THEN Nx uses positional `prepatch` and `--preid=beta` with all git and staging effects disabled
- AND the only generated version is `@effectify/solid-query@0.5.13-beta.0`
- AND the only generated paths are the root changelog and Solid manifest

#### Scenario: Corrective suppression fails closed

- GIVEN a merge has partial, mixed, message-only, wrong-version, or additional-path changes
- WHEN beta classifies the merge
- THEN it MUST NOT suppress the run as the corrective beta shape

### Requirement: Exact authorized promotion matrix

The system MUST accept the promotion only when the requested project set is complete, duplicate-free, and exactly matches this source-to-target matrix:

| Package                               | Beta source     | Stable target |
| ------------------------------------- | --------------- | ------------- |
| `@effectify/hatchet`                  | `0.1.0-beta.0`  | `0.1.0`       |
| `@effectify/node-better-auth`         | `0.5.12-beta.0` | `0.5.12`      |
| `@effectify/prisma`                   | `1.1.13-beta.0` | `1.1.13`      |
| `@effectify/react-query`              | `1.0.0-beta.1`  | `1.0.0`       |
| `@effectify/react-router`             | `0.6.0-beta.0`  | `0.6.0`       |
| `@effectify/react-router-better-auth` | `0.5.12-beta.0` | `0.5.12`      |
| `@effectify/solid-query`              | `0.5.13-beta.0` | `0.5.13`      |

Every stable target MUST equal the semver core of its authorized beta source. The system MUST NOT recalculate, increment, substitute, or partially promote this matrix.

#### Scenario: Complete matrix is accepted

- GIVEN all seven distinct authorized projects have the listed beta source versions
- WHEN an authorized operator requests stable preparation or finalization for all seven projects
- THEN the system accepts the matrix as the sole candidate matrix
- AND each candidate target is the listed stable semver core

#### Scenario: Partial, duplicate, or altered matrix is rejected

- GIVEN a request omits a project, repeats a project, adds a project, changes a source version, or changes a target version
- WHEN the system validates the request
- THEN it MUST stop before any repository or external release mutation

### Requirement: Side-effect-isolated PREPARE

PREPARE MUST freshly verify current `origin/master`, run the required policy, build, test, and readiness gates, and materialize the exact stable matrix using the installed Nx version capability with commit, tag, push, and staging effects disabled. During materialization, all local refs MUST remain unchanged. PREPARE MUST have no npm publication credential and MUST NOT create or mutate npm artifacts, git tags, GitHub Releases, issues, pull requests, workflow dispatches, or `master`.

#### Scenario: Materialization has no release side effects

- GIVEN the checkout and `origin/master` identify the authorized source SHA and all gates pass
- WHEN PREPARE materializes stable release files
- THEN no local ref moves
- AND no file is staged by the materialization command
- AND no commit, tag, push, npm mutation, GitHub mutation, or workflow dispatch occurs

#### Scenario: A gate or ref invariant fails

- GIVEN a required gate fails or a local ref changes during materialization
- WHEN PREPARE evaluates its pre-commit invariants
- THEN PREPARE MUST stop without pushing a branch or mutating external release state

### Requirement: Exact PREPARE paths and branch

PREPARE MUST require the generated diff to contain exactly these eight paths and no others:

- `CHANGELOG.md`
- `packages/hatchet/package.json`
- `packages/node/better-auth/package.json`
- `packages/prisma/package.json`
- `packages/react/query/package.json`
- `packages/react/router/package.json`
- `packages/react/router-better-auth/package.json`
- `packages/solid/query/package.json`

After validating the exact matrix and paths, PREPARE MAY stage only those paths, MUST create exactly one preparation commit, MUST verify a clean working tree, and MUST push only `HEAD:refs/heads/release/stable-<source-sha>`, where `<source-sha>` is the first 12 lowercase hexadecimal characters of the freshly verified `origin/master` SHA.

#### Scenario: Valid preparation branch is produced

- GIVEN materialization yielded exactly the authorized versions at exactly the eight allowed paths
- WHEN PREPARE commits and pushes the result
- THEN exactly one preparation commit is created
- AND the working tree is clean
- AND the only pushed refspec is `HEAD:refs/heads/release/stable-<12-character-source-sha>`

#### Scenario: Unexpected path is adversarial

- GIVEN materialization changes an additional path, omits an allowed path, or changes a path by an unexpected spelling
- WHEN PREPARE validates the diff
- THEN PREPARE MUST fail before staging, committing, or pushing

### Requirement: Protected operator authorization

A maintainer MUST manually create or reuse the approved issue and manually open the linked `type:chore` pull request from the prepared branch. Required checks, review, and branch protection MUST govern merge into `master`. Workflows and local operators MUST NOT push directly to `master`, bypass branch protection, automatically create the authorization issue or pull request, or treat PREPARE completion as merge authorization.

#### Scenario: Authorized protected merge

- GIVEN PREPARE pushed a valid dedicated branch
- WHEN a maintainer links the approved issue, opens the required pull request, and protected review and checks authorize merge
- THEN the change MAY enter `master` through that protected merge

#### Scenario: Attempted direct protected-branch write

- GIVEN an operator or workflow attempts to push the preparation commit directly to `master`
- WHEN authorization boundaries are enforced
- THEN the write MUST be refused
- AND no substitute bypass or automated pull request creation MAY occur

### Requirement: Structural beta suppression

The beta workflow MUST suppress recursion only when the merged diff structurally matches the complete stable promotion: exactly the eight authorized paths, all seven exact authorized prerelease-to-stable manifest transitions, and no mixed or additional change. Commit messages or tokens alone MUST NOT authorize suppression. Partial, mixed, malformed, or ambiguous release-shaped changes MUST fail closed rather than being silently suppressed.

#### Scenario: Exact stable merge is suppressed

- GIVEN a protected merge changes exactly the root changelog and seven manifests
- AND every manifest changes from its authorized beta source to its exact stable target
- WHEN the beta workflow classifies the merge
- THEN it MUST suppress beta preparation for that merge

#### Scenario: Message-only lookalike is not suppressed

- GIVEN a merge message resembles a stable release but its paths or version transitions do not exactly match the authorized structure
- WHEN the beta workflow classifies the merge
- THEN it MUST NOT suppress based on the message
- AND it MUST fail closed when the shape is partial, mixed, malformed, or ambiguous

### Requirement: Exact-SHA FINALIZE authorization

FINALIZE MUST accept only a full lowercase 40-character `expected_sha`, freshly fetch `origin/master`, and require `HEAD == origin/master == expected_sha` before any external mutation. It MUST reconstruct the complete exact stable matrix from the merged manifests and MUST reject every other checkout, remote head, project set, or manifest state.

#### Scenario: Exact merged SHA is authorized

- GIVEN `expected_sha` is a full lowercase 40-character SHA
- AND freshly fetched `origin/master`, checkout `HEAD`, and `expected_sha` are identical
- AND merged manifests contain the exact stable matrix
- WHEN FINALIZE completes authorization checks
- THEN it MAY begin external-state reconciliation

#### Scenario: Stale or malformed SHA is rejected

- GIVEN the SHA is malformed, uppercase, abbreviated, stale, or differs from `HEAD` or fetched `origin/master`
- WHEN FINALIZE validates authorization
- THEN it MUST stop before creating or publishing any artifact

### Requirement: Fail-closed preflight and collisions

Before mutation, FINALIZE MUST read and validate all relevant npm version histories and `latest` dist-tags, exact remote tag refs, and GitHub Releases. Unknown, unreadable, malformed, unauthorized, duplicate, or conflicting state MUST stop the run. An existing exact npm stable version is acceptable only when `latest` already equals that exact version; otherwise FINALIZE MUST stop and MUST NOT repair `latest` without separate explicit authorization. Stable version collisions MUST NOT cause automatic version advancement.

#### Scenario: Existing npm version has divergent latest

- GIVEN an exact authorized stable npm version exists
- AND its package's `latest` dist-tag does not equal that version
- WHEN FINALIZE performs preflight
- THEN FINALIZE MUST stop without moving the dist-tag or mutating other release state

#### Scenario: External state cannot be established

- GIVEN a tag, Release, npm history, or dist-tag read is unavailable, malformed, duplicated, or ambiguous
- WHEN FINALIZE performs preflight
- THEN it MUST fail closed before mutation

### Requirement: Ordered stable artifact reconciliation

FINALIZE MUST reconcile artifacts in the order git tags, GitHub Releases, then npm publications. Each stable tag MUST be uniquely named `{package-name}@{stable-version}`, annotated, and peeled to `expected_sha`; missing tags MUST be pushed only by explicit tag refspecs in one atomic tag-only push. Each GitHub Release MUST match its exact tag and MUST be non-draft and non-prerelease; only missing Releases MAY be created. Existing mismatched, lightweight, wrong-target, draft, prerelease, or duplicate artifacts MUST cause failure and MUST NOT be rewritten or retargeted.

#### Scenario: Missing stable metadata is created in order

- GIVEN preflight establishes no conflicts and some authorized tags and Releases are missing
- WHEN FINALIZE reconciles metadata
- THEN it creates and atomically pushes only missing annotated tags at `expected_sha`
- AND it subsequently creates only missing non-draft, non-prerelease Releases for those exact tags
- AND npm publication does not begin before tag and Release reconciliation succeeds

#### Scenario: Existing tag targets the wrong object

- GIVEN an authorized stable tag exists but is lightweight, non-unique, or peels to a SHA other than `expected_sha`
- WHEN FINALIZE validates tags
- THEN it MUST stop without deleting, replacing, force-pushing, or retargeting the tag

### Requirement: Missing-only stable npm publication

FINALIZE MUST publish only packages whose exact authorized stable versions are absent. Publication MUST use Nx and MUST omit `--tag`, thereby using npm `latest`; FINALIZE MUST NOT publish stable versions under `alpha` or `beta`. After publication, FINALIZE MUST verify that every exact stable version exists and that each package's `latest` equals that exact stable version.

#### Scenario: Missing subset is published to latest

- GIVEN all pre-existing exact versions have matching `latest` and a subset of authorized stable versions is absent
- WHEN FINALIZE reaches npm reconciliation
- THEN it publishes only the missing subset through Nx without `--tag`
- AND post-verification confirms all seven exact versions and matching `latest` tags

#### Scenario: Publication verification diverges

- GIVEN npm publication reports success but an exact version or `latest` verification does not match the authorized matrix
- WHEN FINALIZE post-verifies npm state
- THEN it MUST report failure and stop further mutation
- AND recovery MUST require the same exact authorized FINALIZE request

### Requirement: Channel isolation and prerelease immutability

Alpha releases MUST remain prerelease versions published only with npm `--tag=alpha`. Beta releases MUST remain prerelease versions represented by annotated tags, prerelease GitHub Releases, and npm publication only with `--tag=beta`. Stable releases MUST have no prerelease suffix, MUST use annotated tags and non-prerelease GitHub Releases, and MUST publish without `--tag` so only stable publication advances `latest`. Promotion MUST NOT delete, rewrite, retarget, deprecate, unpublish, or otherwise mutate any existing alpha or beta package version, dist-tag, git tag, or GitHub prerelease.

#### Scenario: Stable promotion preserves prerelease history

- GIVEN existing alpha and beta artifacts and dist-tags
- WHEN the stable promotion completes
- THEN every prior alpha and beta artifact and channel pointer is unchanged
- AND only the authorized stable versions become eligible to advance `latest`

#### Scenario: Cross-channel publication is attempted

- GIVEN a stable publication includes `--tag=alpha` or `--tag=beta`, or a prerelease publication would advance `latest`
- WHEN channel policy is validated
- THEN the operation MUST be rejected before publication

### Requirement: Idempotent forward recovery

Repeated FINALIZE requests for the same exact SHA and matrix MUST converge forward: exact matching artifacts MUST count as complete, missing artifacts MUST be created or published in the prescribed order, and versions MUST never be recalculated. After any public stable artifact exists, recovery MUST NOT delete, rewrite, retarget, unpublish, deprecate, or independently alter dist-tags; conflicting state MUST stop for separate authorization.

#### Scenario: Retry after partial non-atomic completion

- GIVEN an earlier exact FINALIZE created some valid Releases or published some valid npm versions before interruption
- WHEN the same exact SHA and matrix are retried
- THEN matching artifacts are left unchanged
- AND only missing authorized artifacts continue in the prescribed order

#### Scenario: Retry request changes identity

- GIVEN a retry supplies a different SHA, matrix, or recalculated version
- WHEN FINALIZE validates the retry
- THEN it MUST reject the request before mutation

### Requirement: Operator stop and recovery boundaries

Before merge, an operator MAY abandon or delete only the dedicated preparation branch and associated pull request. After merge but before any public stable artifact exists, cancellation MUST use the ordinary protected pull-request process to revert the preparation commit. After any stable artifact exists, operators MUST stop on conflict and MAY recover only by rerunning the same exact-SHA FINALIZE when remaining state is still authorized. Local or ad hoc mutation of npm, tags, Releases, or protected `master` MUST NOT be an authorized recovery method.

#### Scenario: Cancellation before publication

- GIVEN the protected preparation commit has merged but no stable tag, Release, or npm version has been created
- WHEN an authorized maintainer cancels the promotion
- THEN cancellation MUST proceed through a protected revert pull request

#### Scenario: Conflict after public publication

- GIVEN at least one public stable artifact exists and a later reconciliation step finds a conflict
- WHEN an operator evaluates recovery
- THEN the operator MUST stop further mutation
- AND MUST NOT delete or rewrite completed artifacts
- AND MAY resume only with the same exact-SHA FINALIZE after the state is again known to satisfy authorization rules
