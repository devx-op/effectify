# CI and npm release setup

Effectify has three separate release channels. Beta now prepares a reviewable branch before a maintainer explicitly finalizes the merged release; alpha and stable behavior is unchanged.

## Release channel map

| Channel | Trigger                                  | npm tag            | Workflow                               |
| ------- | ---------------------------------------- | ------------------ | -------------------------------------- |
| Alpha   | Push to `dev`                            | `alpha`            | `.github/workflows/release-alpha.yml`  |
| Beta    | Push to `master`                         | `beta`             | `.github/workflows/cd.yml`             |
| Stable  | Manual workflow against current `master` | default (`latest`) | `.github/workflows/release-stable.yml` |

A `chore(release):` commit pushed by a release workflow does not start another beta publication. Stable has no push trigger and cannot be reached by a normal branch push.

## Required repository setup

Use Node.js 24.19.0 and pnpm 10.14.0 locally when reproducing workflow checks.

Configure these GitHub Actions secrets under **Settings > Secrets and variables > Actions**:

| Secret          | Purpose                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------- |
| `NPM_TOKEN`     | npm authentication and provenance publication                                             |
| `RELEASE_TOKEN` | Optional checkout token for stable release git operations; `GITHUB_TOKEN` is the fallback |

The release jobs request `contents: write` for Nx release commits, tags, and GitHub releases, and `id-token: write` for npm provenance.

## Nx release projects

All release workflows derive their allowlist from `nx.json`. The seven current Nx project names are:

1. `@effectify/react-router`
2. `@effectify/react-query`
3. `@effectify/node-better-auth`
4. `@effectify/solid-query`
5. `@effectify/react-router-better-auth`
6. `@effectify/prisma`
7. `@effectify/hatchet`

Use these project names—not filesystem paths—in manual workflow inputs.

## Exact workflow behavior

### CI: `.github/workflows/ci.yml`

**Triggers:** pull requests that are opened, synchronized, reopened, or marked ready for review, plus pushes to `dev`.

For non-draft pull requests, CI runs the static release-policy contract, affected lint and format checks, affected type checks, affected builds, and affected tests. The release-policy contract is dependency-free and runs with Node.js 24.19.0:

```bash
node --test scripts/release-policy-contract.test.mjs
```

### Alpha: `.github/workflows/release-alpha.yml`

**Triggers:** pushes to `dev` and optional manual dispatch.

A normal run calculates projects affected across the GitHub push event's exact `before`-to-`github.sha` range, then intersects those exact project names with the seven-project release allowlist. Invalid or zero `before` SHAs safely fall back to the current commit's parent. If the intersection is empty, publication is skipped. Otherwise the workflow builds, tests, versions with Nx `--preid=alpha`, rebuilds the versioned packages, and publishes with npm `--tag=alpha`.

Manual publish-only recovery requires an explicit comma-separated `projects` input. It publishes the selected existing manifests with `--tag=alpha` and skips version, changelog, and git mutation.

### Beta: `.github/workflows/cd.yml`

**Triggers:** pushes to `master` and manual dispatch. A normal eligible push prepares, but does not publish, a verified `release/beta-<12-character-source-sha>` branch. A beta release-shaped merge is suppressed structurally; `chore(release):` and `[skip release]` are defense-in-depth signals, not sufficient suppression by themselves.

#### Beta quick path

The published `@effectify/solid-query@0.5.12` collision cannot be repaired by moving `latest` back to the stale tarball. Recovery is strictly ordered: merge the implementation PR; run corrective beta PREPARE/PR/FINALIZE for only `@effectify/solid-query@0.5.13-beta.0`; then run the seven-project stable PREPARE/PR/FINALIZE ending at `@effectify/solid-query@0.5.13`.

1. Let an eligible `master` push run PREPARE. The existing incident PREPARE still requires all seven projects. The one corrective exception selects only `@effectify/solid-query`; the workflow fixes positional `prepatch`, `--preid=beta`, and all disabled git/staging effects, and accepts only root `CHANGELOG.md` plus `packages/solid/query/package.json` at `0.5.13-beta.0`.
2. Verify the summary's source SHA, release branch, changed paths, and versions. PREPARE changes only root `CHANGELOG.md` and the selected manifests.
3. Create or reuse the required approved issue. Manually open one linked PR from the reported release branch to `master`; its sole `type:*` label is `type:chore`.
4. Use ordinary required checks, human review, and protected merge. Confirm the merge-triggered beta run reports `suppress` and publishes nothing.
5. Copy the resulting current 40-character lowercase `master` SHA. Manually dispatch `publish_only=true` with the exact projects and that SHA as `expected_sha`.
6. Verify every exact annotated tag, non-draft GitHub prerelease, npm version, and `beta` dist-tag.

FINALIZE freshly checks that checkout `HEAD`, `origin/master`, and `expected_sha` are equal. It verifies or creates exact annotated tags with one atomic tag-only push, verifies or creates exact prereleases, publishes only missing npm packages through Nx with `--tag=beta`, and post-verifies every selected npm beta. Exact publish-only recovery retries are safe; unknown or conflicting external state stops the run.

#### Authorized incident matrix

| Package                               | Required beta version |
| ------------------------------------- | --------------------- |
| `@effectify/react-router`             | `0.6.0-beta.0`        |
| `@effectify/react-query`              | `1.0.0-beta.1`        |
| `@effectify/node-better-auth`         | `0.5.12-beta.0`       |
| `@effectify/solid-query`              | `0.5.12-beta.0`       |
| `@effectify/react-router-better-auth` | `0.5.12-beta.0`       |
| `@effectify/prisma`                   | `1.1.13-beta.0`       |
| `@effectify/hatchet`                  | `0.1.0-beta.0`        |

Do **not** dispatch stable during either beta recovery. Complete corrective beta PREPARE, its protected PR, and exact-SHA FINALIZE before starting the seven-project stable PREPARE. Stop on a newer `master`, an unexpected generated path or version, an ambiguous remote read, a lightweight or wrong-target tag, a conflicting Release, or inconsistent npm state.

Before publication, rollback is limited to deleting the unprotected prepared branch or closing/reverting the release PR through normal policy. Do not delete published tags, Releases, or npm artifacts as rollback; rerun the exact FINALIZE request or obtain authorization for a fix-forward release.

### Stable: `.github/workflows/release-stable.yml`

Stable is a protected **PREPARE → manual authorization → FINALIZE** promotion, not a direct release. The first promotion is atomic and accepts exactly this matrix:

| Package                               | Beta source     | Stable target |
| ------------------------------------- | --------------- | ------------- |
| `@effectify/hatchet`                  | `0.1.0-beta.0`  | `0.1.0`       |
| `@effectify/node-better-auth`         | `0.5.12-beta.0` | `0.5.12`      |
| `@effectify/prisma`                   | `1.1.13-beta.0` | `1.1.13`      |
| `@effectify/react-query`              | `1.0.0-beta.1`  | `1.0.0`       |
| `@effectify/react-router`             | `0.6.0-beta.0`  | `0.6.0`       |
| `@effectify/react-router-better-auth` | `0.5.12-beta.0` | `0.5.12`      |
| `@effectify/solid-query`              | `0.5.13-beta.0` | `0.5.13`      |

#### Protected stable quick path

1. Dispatch all seven project names with `publish_only=false` and leave `expected_sha` empty. PREPARE verifies current `master`, policy/build/test/readiness gates, and exact source versions. Nx materializes only `CHANGELOG.md` and the seven manifests with commit, tag, push, and staging disabled.
2. Read the secret-free summary and verify its source SHA, `release/stable-<source-sha12>` branch, versions, and paths. Create or reuse the approved issue, then manually open its linked PR to protected `master`; the sole `type:*` label is `type:chore`. Required checks, review, and branch protection authorize merge. PREPARE does not create issues/PRs, publish, tag, create Releases, or push `master`.
3. Confirm the merge-triggered beta workflow reports structural stable suppression. Message text alone never suppresses; partial, mixed, malformed, or extra-path release shapes stop.
4. Capture the merged current lowercase 40-character `master` SHA. Dispatch the same seven projects with `publish_only=true` and that SHA as `expected_sha`.
5. FINALIZE reads all npm histories/`latest`, exact remote tags, and Releases before mutation, then reconciles **annotated exact-SHA tags → non-draft/non-prerelease Releases → missing-only npm publication**. Stable publication omits `--tag`, so it alone advances `latest`.

Alpha remains prerelease-only with `--tag=alpha`; beta remains prerelease-only with annotated tags, prerelease Releases, and `--tag=beta`; stable has no prerelease suffix and never mutates prior alpha/beta artifacts. npm verification rereads at most six times with ten-second waits. Retry only the same exact SHA and matrix; matching artifacts are retained and only missing artifacts continue.

**Stop immediately** on a moved `master`, altered matrix, unexpected/staged/untracked path, moved ref, unreadable or malformed external state, lightweight/wrong-target/duplicate tag, draft/prerelease stable Release, stable collision, or an existing stable npm version whose `latest` differs. Do not independently repair a dist-tag.

Before merge, abandon/delete only the prepared branch and PR. After merge but before any public artifact, cancel through a protected revert PR. After any public artifact exists, never delete, retarget, unpublish, deprecate, or rewrite it; stop and recover forward only through the same exact FINALIZE after state is authorized.

**Trigger:** manual dispatch only. The workflow has no push trigger. Use only the protected quick path above; the former direct graduation and publish-only recovery procedures are retired.

## Release safety checks

Before any Nx version or publish command, every release workflow runs:

```bash
node --test scripts/release-policy-contract.test.mjs
```

The contract rejects explicitly modeled structural regressions: a stable push trigger, missing beta or alpha prerelease flags, weakened project or current-`master` checks, known version/publish commands moving ahead of required validation, and channel documentation drifting from the workflows.

React Router publication readiness is verified with the maintained React Router 8 project and example targets:

```bash
pnpm nx test @effectify/react-router
pnpm nx run @effectify/react-router-example:migration:test
pnpm nx run @effectify/react-router-example:migration:verify
pnpm nx run @effectify/react-router-example:migration:manifest
pnpm nx run @effectify/react-router-example:consolidation:verify
```

## Recovery checklist

- Confirm the workflow run is using the intended channel and exact project names.
- For alpha recovery, confirm existing versions carry the alpha suffix.
- For beta recovery, follow the PREPARE → approved issue → linked PR → protected merge → exact-SHA FINALIZE path above.
- For stable recovery, confirm every selected manifest is stable and use stable's documented publish-only mode only for an existing version.
- Review workflow summaries, GitHub Releases, and npm package pages after completion.
