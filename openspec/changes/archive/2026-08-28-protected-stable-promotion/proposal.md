# Proposal: Protected Stable Promotion

## Intent

Promote all seven current beta package versions to their exact stable counterparts without bypassing protected `master` or mutating release state directly from a local checkout. Stable release handling should adopt the proven protected PREPARE → reviewed PR → exact-SHA FINALIZE model and establish a durable channel invariant: alpha publishes only to `alpha`, beta only to `beta`, and stable alone advances npm `latest`.

## Decision

Replace the direct stable Nx release path with a protected state machine:

1. **PREPARE** materializes the authorized stable files on a dedicated `release/stable-<source-sha>` branch with Nx git side effects disabled.
2. A maintainer manually opens the required linked, protected release PR; normal checks, review, and branch protection govern its merge.
3. The beta workflow structurally suppresses the resulting prerelease-to-stable release-shaped merge so it cannot recursively prepare another beta.
4. **FINALIZE** reconciles stable tags, GitHub Releases, and npm publication only for the exact merged `master` SHA.

No phase may push directly to `master`, bypass branch protection, or directly mutate npm/GitHub release state from a local operator environment.

## Scope

### In Scope

- Promote the complete, duplicate-free seven-package matrix:

  | Package                               | Beta source     | Stable target |
  | ------------------------------------- | --------------- | ------------- |
  | `@effectify/hatchet`                  | `0.1.0-beta.0`  | `0.1.0`       |
  | `@effectify/node-better-auth`         | `0.5.12-beta.0` | `0.5.12`      |
  | `@effectify/prisma`                   | `1.1.13-beta.0` | `1.1.13`      |
  | `@effectify/react-query`              | `1.0.0-beta.1`  | `1.0.0`       |
  | `@effectify/react-router`             | `0.6.0-beta.0`  | `0.6.0`       |
  | `@effectify/react-router-better-auth` | `0.5.12-beta.0` | `0.5.12`      |
  | `@effectify/solid-query`              | `0.5.12-beta.0` | `0.5.12`      |

- Require PREPARE to verify current `origin/master`, the exact authorized matrix, policy/build/test/readiness gates, unchanged refs, and an exact generated diff containing only root `CHANGELOG.md` and the seven selected manifests.
- Materialize stable versions using the installed Nx version command with commit, tag, push, and staging effects disabled; confirm the exact supported CLI syntax before implementation.
- Permit PREPARE to create one preparation commit and push only `HEAD:refs/heads/release/stable-<12-character-source-sha>`.
- Extend beta structural suppression to recognize only a complete, valid prerelease-to-stable release merge, without relying on commit text alone.
- Require FINALIZE to verify `HEAD == origin/master == expected_sha`, where `expected_sha` is a full lowercase 40-character SHA, and to reconstruct the exact stable matrix from merged manifests.
- Reconcile artifacts in tags → GitHub Releases → npm order: unique annotated stable tags at the exact SHA, non-draft/non-prerelease Releases, and missing-only Nx publication without `--tag` so npm `latest` advances.
- Make retries convergent: exact matching artifacts count as complete, missing artifacts continue, and malformed, unknown, unauthorized, or conflicting state fails closed.
- Update release policy contracts and operator documentation for preparation, authorization, suppression, finalization, retries, stop conditions, recovery, and channel behavior.
- Preserve all existing alpha and beta package versions, dist-tags, git tags, and GitHub prereleases.

### Out of Scope

- Direct pushes to `master`, branch-protection bypass, automated issue/PR creation, or workflow dispatch from another release workflow.
- Local or ad hoc mutation of npm packages/dist-tags, git tags, or GitHub Releases.
- Deleting, rewriting, retargeting, deprecating, or unpublishing existing alpha, beta, or stable artifacts.
- Package source changes, new release services, new dependencies, or changes to alpha behavior.
- Automatic repair when an exact stable npm version exists but `latest` points elsewhere; that condition requires separate explicit authorization.
- General subset-based stable promotion in this incident slice; the first promotion requires all seven packages.

## Approach

### PREPARE

A manual stable PREPARE accepts the complete project set, resolves it through the release allowlist, rejects duplicates or omissions, and freshly validates `origin/master`. It runs existing policy, build, test, and React Router readiness gates before generating files. Nx version materialization must retain relative-patch graduation semantics while explicitly disabling commit, tag, push, and staging behavior.

The workflow compares sorted source and target matrices, requires every source to be the authorized prerelease and every target to equal its semver core, and fails on stable collisions rather than auto-advancing. It verifies that only `CHANGELOG.md` and the seven manifests changed and that local refs did not move. It then stages only those paths, creates one preparation commit, verifies a clean tree, and pushes only the dedicated stable branch. PREPARE has no npm publication credential and creates no tag, Release, issue, PR, workflow dispatch, or `master` mutation.

### Protected authorization and suppression

A maintainer creates or reuses the approved issue and manually opens the linked `type:chore` PR. Existing checks, review requirements, and branch protection remain authoritative. On merge, the beta workflow inspects paths and manifest transitions; it suppresses only the exact release shape where all expected changes graduate prereleases to their stable semver cores. Partial, mixed, or suspicious shapes fail rather than suppressing based on a message token.

### FINALIZE

Manual FINALIZE accepts the same complete project set and exact merged SHA. It freshly fetches `origin/master`, requires checkout HEAD and remote master to equal `expected_sha`, validates the merged stable matrix, and reads all relevant npm histories/dist-tags, remote tag refs, and GitHub Releases before mutation. Unknown or conflicting reads stop the run.

Existing npm versions are accepted only if `latest` already equals the exact stable version. Existing tags are accepted only when they are unique annotated tags peeled to `expected_sha`; missing tags are created locally and pushed together using explicit tag-only refspecs and an atomic push. Existing Releases must match the tag and be non-draft and non-prerelease; only missing Releases are created. Finally, only missing package versions are published through Nx with no prerelease tag, followed by verification of every exact version and `latest` dist-tag.

Because GitHub Release creation and seven npm publications are not atomic, recovery is forward-only through the same exact FINALIZE request. FINALIZE never recalculates or increments versions.

## Channel Policy

- **Alpha:** prerelease versions, npm `--tag=alpha`, and alpha artifacts only.
- **Beta:** prerelease versions, annotated tags, GitHub prereleases, and npm `--tag=beta`.
- **Stable:** versions without prerelease suffixes, annotated tags, non-prerelease GitHub Releases, and npm publication without `--tag`, advancing `latest`.

Promotions add stable artifacts; they never delete, retarget, or rewrite prerelease artifacts. Future channel work must preserve alpha → alpha, beta → beta, and stable → latest-only behavior.

## Affected Areas

| Area                                       | Impact   | Description                                                             |
| ------------------------------------------ | -------- | ----------------------------------------------------------------------- |
| `.github/workflows/release-stable.yml`     | Modified | Protected PREPARE and exact-SHA FINALIZE orchestration                  |
| `.github/workflows/cd.yml`                 | Modified | Structural prerelease-to-stable merge suppression                       |
| `scripts/release-policy-contract.test.mjs` | Modified | Mutation-resistant contracts for stable flow, channels, and suppression |
| `.github/SETUP.md`                         | Modified | Maintainer procedure, authorized matrix, stop conditions, and recovery  |

`nx.json`, custom version actions, package code, and alpha behavior remain unchanged unless a non-mutating implementation-time check proves the installed Nx CLI cannot perform side-effect-free relative-patch graduation. Such evidence is a design checkpoint, not authorization to invent a parallel release system.

## Risks and Mitigations

| Risk                                                                     | Impact                                                                | Mitigation                                                                                                          |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Installed Nx syntax does not isolate version materialization             | PREPARE could attempt forbidden git effects or alter unexpected files | Confirm CLI syntax non-mutatively; require disabled commit/tag/push/staging, exact paths, and unchanged refs        |
| Structural suppression accepts an ordinary or partial package edit       | A legitimate beta release could be skipped                            | Require exact path and prerelease-to-semver-core transition shape; reject mixed, partial, or ambiguous diffs        |
| Existing external artifacts conflict with the authorized SHA or metadata | Stable identity could split across git, GitHub, and npm               | Read all state before mutation and fail closed on wrong-target, lightweight, malformed, divergent, or unknown state |
| npm exact version exists while `latest` diverges                         | Automatic repair could move consumer traffic unexpectedly             | Treat as a conflict requiring separate authorization; do not move the dist-tag independently                        |
| FINALIZE partially completes across non-atomic systems                   | Some packages or Releases may exist while others do not               | Reconcile in a fixed order, publish only missing artifacts, post-verify, and retry the same exact SHA/matrix        |
| Stable promotion accidentally changes prerelease channels                | Existing consumers or audit history could be disrupted                | Contractually enforce channel-specific tags and immutable prior artifacts                                           |

## Rollback and Recovery

Before the protected PR merges, rollback is deletion or abandonment of the dedicated stable branch and PR; no public release artifact exists. After merge but before FINALIZE, revert the preparation commit through the ordinary protected PR process if promotion must be canceled.

After any stable artifact is published, rollback is not deletion, retagging, unpublishing, or dist-tag manipulation. Stop further mutation, preserve completed artifacts, diagnose the conflict, and recover forward through the same exact-SHA FINALIZE only when the remaining state still matches the authorized matrix. Any request to redirect `latest` or alter published artifacts requires a separate explicitly authorized change.

## Success Criteria

- [ ] PREPARE accepts exactly the seven authorized beta sources and generates exactly their stable semver cores.
- [ ] PREPARE changes only root `CHANGELOG.md` and the seven manifests, leaves refs unchanged during materialization, and pushes only a dedicated stable branch.
- [ ] A linked, reviewed, protected PR is mandatory; no workflow or operator pushes directly to `master`.
- [ ] The beta workflow suppresses the exact stable release merge structurally and rejects partial, mixed, or message-only lookalikes.
- [ ] FINALIZE requires the complete project set and exact current merged `master` SHA before any external mutation.
- [ ] Stable tags are annotated and exact-SHA-bound; GitHub Releases are non-draft/non-prerelease; npm publishes without `--tag` and verifies `latest`.
- [ ] Exact retries reconcile missing artifacts without recalculating versions, while every conflicting or unknown state fails closed.
- [ ] Existing alpha and beta artifacts remain unchanged, and policy tests enforce alpha → alpha, beta → beta, stable → latest-only.
- [ ] Operator documentation explains the protected sequence, authorization points, retry behavior, stop conditions, and forward-only recovery.

## Proposal Question Round

The delegated brief includes an approved product decision and leaves no blocking product ambiguity for this proposal. The proposal therefore assumes: the first stable promotion is all-or-nothing across the seven listed packages; a divergent existing npm `latest` is a stop condition rather than an automatic repair opportunity; and post-publication recovery is forward-only. Reviewers may correct these assumptions or request a second product question round before design if business policy changes.
