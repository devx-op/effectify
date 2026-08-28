# Proposal: Minimal Beta Recovery on Protected `master`

## Decision

Split the existing beta job into PREPARE, structural SUPPRESS, and manual FINALIZE modes. Deliver one implementation PR, no more than 1,200 total changed lines, changing only `.github/workflows/cd.yml`, `scripts/release-policy-contract.test.mjs`, and `.github/SETUP.md`.

## Scope

Preserve triggers, affected-project selection, the release allowlist, build/tests, React Router readiness, collision-aware npm-history checks, permissions, concurrency, provenance, Nx publication, and summaries.

Exclude stable and alpha changes, custom release platforms/coordinators/schemas, new dependencies, automatic issue or PR creation, local publication, package changes, and branch-protection bypass. Stable remains undispatched until separately fixed.

## Proposed behavior

### PREPARE

Eligible `master` pushes and manual `publish_only=false` runs pass existing gates, then run:

```bash
pnpm nx release version "--projects=$PROJECTS" --preid=beta \
  --git-commit=false --git-tag=false --git-push=false --stage-changes=false
```

Require beta versions in every selected manifest and an exact diff of those manifests plus root `CHANGELOG.md`; reject ref changes and every other path. Commit only that set and push only `HEAD:refs/heads/release/beta-<source-sha-prefix>`. Do not update `master` or create an issue, PR, tag, GitHub Release, or npm artifact.

For incident recovery, manual PREPARE selects exactly these pairs: `react-router=0.6.0-beta.0`, `react-query=1.0.0-beta.1`, `node-better-auth=0.5.12-beta.0`, `solid-query=0.5.12-beta.0`, `react-router-better-auth=0.5.12-beta.0`, `prisma=1.1.13-beta.0`, and `hatchet=0.1.0-beta.0`.

### Human authorization and SUPPRESS

A maintainer creates and obtains approval for the required issue, then manually opens one linked release PR to `master` whose sole `type:*` classification is `type:chore`. Ordinary checks, review, and branch protection apply. On merge, exact release-output paths and beta version transitions suppress another preparation; release-message tokens are defense in depth and never sufficient alone. Merge publishes nothing.

### FINALIZE

Manual `publish_only=true` requires non-empty exact allowlisted `projects` and a full `expected_sha`. Freshly fetch `origin/master`; require checkout HEAD, current `origin/master`, and `expected_sha` to match; validate merged beta manifests and existing gates before mutation.

Derive exact `{packageName}@{version}` tags. Accept only annotated tags targeting `expected_sha`; create missing annotated tags there and push all missing refs atomically with explicit tag-only refspecs. Then create or verify exact non-draft GitHub prereleases. Only afterward publish missing packages with `pnpm nx release publish "--projects=$PROJECTS" --tag=beta`, and verify exact npm versions and beta dist-tags.

Retries never recalculate versions: matching tags, prereleases, and npm artifacts are complete; missing work continues; lightweight/wrong-target tags, release identity/state conflicts, npm conflicts, and unknown reads fail closed.

## Acceptance

- The implementation remains one PR, three files, and at most 1,200 changed lines.
- PREPARE has exactly the four disabled Nx git/staging effects and the exact generated-file boundary.
- Manual issue approval and the linked sole-`type:chore` PR remain mandatory.
- Structural suppression prevents release-merge recursion.
- FINALIZE is exact-project/exact-current-SHA bound and orders tags → GitHub prereleases → Nx beta publish → npm post-verification.
- The static contract tests these boundaries; SETUP documents preparation, authorization, merge, finalization, retries, stop conditions, and the seven incident versions.
