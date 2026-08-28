# Protected Beta Release Workflow Specification

## Scope

Delivery MUST be one implementation PR of at most 1,200 total changed lines and MUST change only `.github/workflows/cd.yml`, `scripts/release-policy-contract.test.mjs`, and `.github/SETUP.md`. Stable, alpha, custom release-platform work, dependencies, automated issue/PR creation, branch-protection bypass, and local publication are out of scope.

## Requirements

### Requirement: PREPARE is side-effect-free versioning

PREPARE MUST preserve existing selection, allowlist, policy, build/test, React Router readiness, and collision-aware version gates. It MUST run `pnpm nx release version "--projects=$PROJECTS" --preid=beta --git-commit=false --git-tag=false --git-push=false --stage-changes=false`.

#### Scenario: Gates pass

**Given** eligible preparation and all existing gates pass; **when** Nx materializes versions; **then** the exact command and all four `false` flags MUST be used.

#### Scenario: A gate fails

**Given** any required result fails or is uncertain; **when** PREPARE evaluates it; **then** versioning and remote mutation MUST stop.

### Requirement: PREPARE output and push are exact

The diff MUST equal selected beta manifests plus root `CHANGELOG.md`; missing paths, unselected manifests, lockfiles, package changelogs, source/workflow files, other paths, or ref changes MUST fail. PREPARE MUST commit only that set and push only `HEAD:refs/heads/release/beta-<source-sha-prefix>`.

#### Scenario: Exact output

**Given** every selected manifest contains a beta prerelease and the exact path set changed; **when** refs are unchanged and validation completes; **then** PREPARE MUST commit that set and push only the explicit release-branch refspec.

#### Scenario: Output drifts

**Given** a version, path, or ref differs; **when** PREPARE validates output; **then** it MUST fail before commit or push and MUST NOT update `master`, tags, Releases, npm, issues, or PRs.

### Requirement: Release authorization is manual and issue-first

A maintainer MUST obtain approval for the repository-required issue, then manually open one linked release PR to `master`; its sole `type:*` classification MUST be `type:chore`. Required checks, human review, and branch protection MUST govern merge.

#### Scenario: Authorization is complete

**Given** the issue is approved and the prepared branch exists; **when** the maintainer opens the linked sole-`type:chore` release PR; **then** ordinary protected review MAY merge it.

#### Scenario: Authorization is incomplete

**Given** approval, linkage, sole classification, checks, or review is missing; **when** merge is considered; **then** the release MUST NOT be treated as authorized.

### Requirement: Release merges are structurally suppressed

A `master` push changing only root changelog and configured manifests through valid beta transitions MUST suppress preparation and publication. Commit-message tokens MAY defend in depth but MUST NOT classify a merge alone.

#### Scenario: Exact release shape merges

**Given** only expected release outputs and beta transitions are present; **when** the merge push runs; **then** it MUST suppress PREPARE and MUST publish nothing.

#### Scenario: Structure is suspicious

**Given** message-only evidence or beta-shaped output has missing or unexpected paths; **when** classification runs; **then** it MUST fail rather than suppress or prepare.

### Requirement: FINALIZE is bound to projects and current `master`

FINALIZE MUST be manual `publish_only=true`, require non-empty exact allowlisted `projects` plus a full `expected_sha`, freshly fetch `origin/master`, and prove checkout HEAD and current `origin/master` equal `expected_sha`. Selected merged manifests MUST contain the beta versions being finalized.

#### Scenario: Preflight identity matches

**Given** valid inputs and merged beta manifests; **when** all three SHA values match after fresh fetch; **then** FINALIZE MAY reconcile tags.

#### Scenario: Identity differs

**Given** an input, selected manifest, or SHA check is absent or mismatched; **when** preflight runs; **then** tag, GitHub Release, and npm mutation MUST stop.

### Requirement: Tags are exact, annotated, and tag-only atomic

Each tag MUST be `{packageName}@{version}` from a selected merged manifest. Existing tags MUST be annotated and peel to `expected_sha`; missing tags MUST be created annotated at that SHA and pushed once with `--atomic` and explicit tag-only refspecs.

#### Scenario: Tags reconcile

**Given** preflight passed and tags are exact or missing; **when** reconciliation runs; **then** exact tags MUST be accepted and all missing tags atomically pushed without a branch refspec.

#### Scenario: A tag conflicts

**Given** a tag is lightweight, wrong-target, ambiguous, or has conflicting identity; **when** it is checked; **then** FINALIZE MUST fail before GitHub Release or npm mutation.

### Requirement: GitHub prereleases precede npm

After every tag verifies, FINALIZE MUST create or accept only the exact non-draft GitHub prerelease for each tag. Conflicting or uncertain tag, target, identity, draft, or prerelease state MUST fail before npm.

#### Scenario: Prereleases reconcile

**Given** all exact tags verify; **when** GitHub Releases are read; **then** exact prereleases MUST be accepted, missing prereleases created, and all reread before npm.

### Requirement: Nx publishes only missing exact betas

Only after tags and prereleases verify MAY FINALIZE run `pnpm nx release publish "--projects=$PROJECTS" --tag=beta` for missing projects. It MUST post-verify every selected exact npm version and beta dist-tag. Retries MUST accept exact completed artifacts, continue missing work, never recalculate versions or intentionally republish, and fail conflicts or unknown state.

#### Scenario: Retry follows partial publication

**Given** some exact artifacts exist and others are missing; **when** the same projects and `expected_sha` are retried; **then** only missing npm projects MAY publish and all selected results MUST be post-verified.

### Requirement: Incident versions are immutable

Incident PREPARE MUST select all and only: `@effectify/react-router@0.6.0-beta.0`, `@effectify/react-query@1.0.0-beta.1`, `@effectify/node-better-auth@0.5.12-beta.0`, `@effectify/solid-query@0.5.12-beta.0`, `@effectify/react-router-better-auth@0.5.12-beta.0`, `@effectify/prisma@1.1.13-beta.0`, and `@effectify/hatchet@0.1.0-beta.0`.

#### Scenario: Incident matrix differs

**Given** any pair is missing, additional, or different; **when** incident output is validated; **then** PREPARE MUST stop before branch push and stable MUST remain undispatched.

### Requirement: Static contracts enforce mode boundaries

The policy test MUST parse active workflow structure and reject PREPARE access to protected-branch push or publication, weakened suppression/SHA/tag/order/post-verification checks, and alpha/stable drift.

#### Scenario: A protected boundary regresses

**Given** workflow structure violates a required PREPARE, SUPPRESS, or FINALIZE boundary; **when** `scripts/release-policy-contract.test.mjs` runs; **then** the contract test MUST fail.
