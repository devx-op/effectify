# CI and npm release setup

Effectify releases through three isolated channels. Stable promotion is a two-stage beta → stable process with two reviewed release PRs; implementation PRs never publish directly.

## Release channel map

| Channel | Trigger                                  | npm tag            | Workflow                               |
| ------- | ---------------------------------------- | ------------------ | -------------------------------------- |
| Alpha   | Push to `dev`                            | `alpha`            | `.github/workflows/release-alpha.yml`  |
| Beta    | Push to `master`                         | `beta`             | `.github/workflows/cd.yml`             |
| Stable  | Manual workflow against current `master` | default (`latest`) | `.github/workflows/release-stable.yml` |

Alpha remains prerelease-only with `--tag=alpha`; beta remains prerelease-only with `--tag=beta`. Only protected stable may publish with `--tag latest` and advance npm `latest`.

## Required repository and npm setup

Use Node.js 24.19.0 and pnpm 10.14.0 when reproducing checks.

Configure `NPM_TOKEN` for the existing alpha and beta workflows. Stable publication does not use that secret: configure an npm trusted publisher for this repository, `.github/workflows/release-stable.yml`, and the `stable-release` GitHub environment.

Create the `stable-release` environment under **Settings > Environments** and require reviewers who are independent from the dispatcher. Restrict deployment branches to protected `master`. The environment is attached to the entire FINALIZE job.

| Stable job          | Declared job permissions             | Explicit capability boundary                                                                                          |
| ------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `validate`          | `contents: read`                     | No secret/token environment; policy, install, build, and test only; checkout credentials are not stored               |
| `package_artifacts` | `contents: read`                     | No OIDC, npm credential, or repository write token; exact-source build/pack and one immutable current-run upload only |
| `prepare`           | `contents: write`                    | `GH_TOKEN` is declared only on the release-branch push step; no OIDC; checkout credentials are not stored             |
| `preflight`         | `contents: read`                     | `GITHUB_TOKEN` is declared only on the read-only finalizer step; no npm credential or publication capability          |
| `finalize`          | `contents: write`, `id-token: write` | Protected environment applies to the job; token and publication settings are declared only on the finalizer step      |

`package_artifacts` is read-only with respect to repository and public release state. It checks out the current `expected_sha` control plane and the exact `artifact_sha` source into separate directories, then installs with `--ignore-scripts`, builds without cache reuse, and packs only in the artifact checkout. The packaging helper verifies package identity, normalized manifests, runtime entrypoints, inventory, and digests before `actions/upload-artifact` uploads one run/attempt-named handoff with overwrite disabled.

PREFLIGHT and protected FINALIZE download that current-run handoff by exact artifact ID. Before any state decision, the finalizer binds the artifact ID and digest plus the handoff's repository, workflow path/ref/SHA, run ID/attempt, `expected_sha`, `artifact_sha`, and exact normalized selection; it then independently verifies every tarball and its recorded digests and inventory. Privileged FINALIZE installs no dependencies, builds or tests nothing, and runs no package code or package lifecycle scripts. It publishes only those verified tarballs, with scripts disabled, through npm trusted publishing with provenance.

Declared job permissions, including `contents` and `id-token`, are available job-wide; when `id-token: write` is declared, OIDC is not step-scoped. The only step-scoped credential controls are explicit secret or token environment variables on their listed API or mutation steps. This environment scoping is defense in depth; it does not turn job permissions into step-only capabilities. Every checkout sets `persist-credentials: false`, so checkout credentials are not persisted.

FINALIZE derives `x-access-token:<token>` Basic authentication from its step-scoped `GITHUB_TOKEN` only for the atomic tag push and supplies it through a one-shot GitHub-scoped `git -c` extraheader. Missing, oversized, whitespace, control-character, or non-ASCII authentication fails before local tag creation. The credential is never written to checkout configuration or printed. PREFLIGHT retains only its existing read token and does not construct tag-push authentication.

The real stable publication boundary is protected `stable-release` environment review, authorization of the reviewed SHA, and npm trusted publishing bound to the repository, workflow, environment, and OIDC claims. Concretely, the external npm trusted-publisher configuration must remain bound to this repository, `.github/workflows/release-stable.yml`, and the `stable-release` environment. `GITHUB_ACTIONS` is checked only as an accidental-use guard, so FINALIZE is refused outside GitHub Actions; it is not an unspoofable local security gate because a local process can set it.

## Nx release projects

The workflows derive the release allowlist from `nx.json.release.projects` and resolve each Nx project name and manifest. The current names are:

1. `@effectify/react-router`
2. `@effectify/react-query`
3. `@effectify/node-better-auth`
4. `@effectify/solid-query`
5. `@effectify/react-router-better-auth`
6. `@effectify/prisma`
7. `@effectify/hatchet`

Manual inputs use project names, not filesystem paths. A selection must be nonempty, duplicate-free, and a subset of the allowlist. Replace the shell values below with that exact normalized comma-separated subset and an approved issue number:

```bash
PROJECTS='@effectify/solid-query'
ISSUE=123
```

## Protected beta → stable quick path

### 1. Produce and publish the beta prerequisite

Merge the implementation through protected `master`. The resulting beta PREPARE selects affected release projects, changes only root `CHANGELOG.md` plus selected manifests, creates one release commit, and pushes `release/beta-<source-sha12>`.

Copy the branch from the workflow summary and open the first release PR. `Closes #$ISSUE` links the approved issue and `type:chore` must be the sole `type:*` label:

```bash
BETA_BRANCH='release/beta-<source-sha12>'
gh pr create --base master --head "$BETA_BRANCH" --title "chore(release): prepare beta" --body "Closes #$ISSUE" --label "type:chore"
BETA_PR=$(gh pr view "$BETA_BRANCH" --json number --jq '.number')
test "$(gh pr view "$BETA_PR" --json commits --jq '.commits | length')" = 1
```

Do not add commits to the generated branch. After required checks and review, merge or squash the single-commit PR; do not rebase-merge a multi-commit branch. Then finalize the selected beta subset at the exact current merged SHA:

```bash
BETA_SHA=$(gh api repos/{owner}/{repo}/git/ref/heads/master --jq '.object.sha')
[[ "$BETA_SHA" =~ ^[0-9a-f]{40}$ ]] || exit 1
gh workflow run cd.yml --ref master -f publish_only=true -f projects="$PROJECTS" -f expected_sha="$BETA_SHA"
```

Wait for beta FINALIZE to verify the selected `X.Y.Z-beta.N` versions and npm `beta` tags. Stable PREPARE requires those beta manifests; stable is not a shortcut around this prerequisite.

### 2. Prepare the selected stable subset

Dispatch PREPARE with no SHA authorization inputs:

```bash
gh workflow run release-stable.yml --ref master \
  -f projects="$PROJECTS" \
  -f publish_only=false \
  -f preflight_only=false \
  -f expected_sha= \
  -f artifact_sha=
```

The read-only `validate` job normalizes the selection, proves current `master`, runs the policy contract, installs, builds, and tests. The credential-isolated PREPARE job consumes that validated selection and SHA, derives strict `X.Y.Z-beta.N` → `X.Y.Z` transitions, and permits only root `CHANGELOG.md` plus selected manifests.

Nx versioning cannot commit, tag, push, or stage. PREPARE creates exactly one local commit, then revalidates its parent, first-parent changed paths, source and target manifest identities, refs, clean tree, and fresh `origin/master`. Only the final dedicated push step declares `GH_TOKEN` in its environment and pushes `release/stable-<source-sha12>`; the job's `contents: write` permission remains job-wide. PREPARE never publishes, tags, creates Releases, pushes `master`, or opens a PR.

### 3. Review the second release PR

Copy the stable branch from the summary and run the exact PR command to manually open its linked PR. This step is intentionally separate from PREPARE:

```bash
STABLE_BRANCH='release/stable-<source-sha12>'
gh pr create --base master --head "$STABLE_BRANCH" --title "chore(release): promote stable" --body "Closes #$ISSUE" --label "type:chore"
STABLE_PR=$(gh pr view "$STABLE_BRANCH" --json number --jq '.number')
test "$(gh pr view "$STABLE_PR" --json commits --jq '.commits | length')" = 1
```

This is the **second reviewed release PR**. The beta release PR reviewed prerelease state; this PR reviews the exact beta-to-stable transitions. It must contain exactly root `CHANGELOG.md` and one manifest per selected project, with no extra path or extra commit. The sole `type:*` label is `type:chore`.

Required checks, review, and branch protection authorize merge. For every PR whose head branch matches `release/stable-*`, the read-only release-policy CI guard validates the GitHub PR head ref plus full head/base SHAs, checks out the actual head, fetches the actual base, and requires `git rev-list --count base..head` to equal one. Extra source commits cannot pass this release PR gate.

FINALIZE supports merge commits and squashes. Rebase merge is supported only for the single PREPARE commit that passed the release PR gate. A squash or single-commit rebase produces a one-parent artifact that presents the complete reviewed release shape in its first-parent diff. An accepted merge commit has exactly two parents: the first parent is protected `master`, the second parent is the single generated release commit based directly on that first parent, the merge tree exactly matches the second-parent tree, and the aggregate first-parent diff is the complete reviewed release shape. If `master` moves before a merge commit is created, rerun PREPARE instead of merging the stale branch.

FINALIZE retains its strict one-parent and exact two-parent graph validation. It cannot distinguish a squash from the last commit produced by a rebase and does not infer whether preceding source commits existed; the release PR CI gate enforces the one-source-commit invariant while GitHub still exposes the branch history. FINALIZE rejects octopus merges, a second parent based on any other commit, merge-time tree changes, and malformed reviewed diffs. The merge-triggered beta workflow must reach generic structural suppression and publish nothing.

### 4. Capture exact SHAs and run PREFLIGHT

Immediately after the stable PR merges, obtain the full lowercase current `expected_sha` and reviewed `artifact_sha`:

```bash
EXPECTED_SHA=$(gh api repos/{owner}/{repo}/git/ref/heads/master --jq '.object.sha')
ARTIFACT_SHA=$(gh pr view "$STABLE_PR" --json mergeCommit --jq '.mergeCommit.oid')
[[ "$EXPECTED_SHA" =~ ^[0-9a-f]{40}$ ]] || exit 1
[[ "$ARTIFACT_SHA" =~ ^[0-9a-f]{40}$ ]] || exit 1
test "$EXPECTED_SHA" = "$ARTIFACT_SHA"
```

For the normal current release the values are identical. `expected_sha` authorizes the current `master`; `artifact_sha` identifies the reviewed release shape. Different values enter only the bounded historical npm publish-only recovery path described below.

Dispatch read-only PREFLIGHT with the same normalized subset:

```bash
gh workflow run release-stable.yml --ref master \
  -f projects="$PROJECTS" \
  -f publish_only=false \
  -f preflight_only=true \
  -f expected_sha="$EXPECTED_SHA" \
  -f artifact_sha="$ARTIFACT_SHA"
```

`package_artifacts` creates the run-bound handoff from the separate exact artifact checkout first. PREFLIGHT downloads it by exact artifact ID, verifies all handoff bindings and tarballs, freshly proves `HEAD == origin/master == expected_sha`, derives the reviewed records from the artifact first-parent diff, and reads npm, tags, and Releases. It has no npm credentials, OIDC, or write token and performs no mutation.

### 5. Dispatch protected FINALIZE

After PREFLIGHT succeeds, dispatch FINALIZE with the same values:

```bash
gh workflow run release-stable.yml --ref master \
  -f projects="$PROJECTS" \
  -f publish_only=true \
  -f preflight_only=false \
  -f expected_sha="$EXPECTED_SHA" \
  -f artifact_sha="$ARTIFACT_SHA"
```

Protected-environment approval occurs before the privileged job. FINALIZE downloads the handoff by exact artifact ID, repeats every binding and tarball verification, and then reconciles in order:

1. for a current artifact, exact annotated tags targeting `artifact_sha`, with one atomic explicit tag-refspec push using the non-persisted one-shot Basic extraheader;
2. for a current artifact, exact non-draft, non-prerelease GitHub Releases;
3. only npm versions still missing, by publishing the independently verified `.tgz` files with `latest`, trusted OIDC, provenance, and lifecycle scripts disabled;
4. bounded verification of every selected npm version and `latest`.

Matching state is retained, response loss is reconciled by rereading, and unknown or conflicting state stops the run. Current-artifact retries use the same exact SHAs and selection; historical recovery has the stricter procedure below.

## Structural suppression and fail-closed behavior

A `master` push containing root `CHANGELOG.md` and any nonempty subset of release manifests is suppressed only when every changed manifest keeps the catalog package name and changes strict `X.Y.Z-beta.N` to exactly `X.Y.Z`. The generic classifier handles a valid Solid Query-only subset exactly like any other subset. There is no package-specific corrective interception or permanent version matrix.

Missing changelog, extra paths, package renames, leading-zero SemVer identifiers, partial transitions, mixed transitions, or unrelated target versions fail closed. Commit messages are only suspicious-shape defenses; they never authorize suppression.

## Safety and recovery

Before release mutation, the validation job runs:

```bash
node --test scripts/release-package-stable.test.mjs scripts/release-finalize-stable.test.mjs scripts/release-policy-contract.test.mjs
```

React Router readiness is checked only when that project is selected:

```bash
pnpm nx test @effectify/react-router
pnpm nx run @effectify/react-router-example:migration:test
pnpm nx run @effectify/react-router-example:migration:verify
pnpm nx run @effectify/react-router-example:migration:manifest
pnpm nx run @effectify/react-router-example:consolidation:verify
```

### Historical npm-only recovery

Historical recovery is exceptional and release-control-path-only. The historical `artifact_sha` must be an ancestor from 1–8 commits behind the current `expected_sha`, and the aggregate `artifact_sha..expected_sha` changed-path set must stay within this hard-coded allowlist:

- `.github/SETUP.md`
- `.github/workflows/release-stable.yml`
- `scripts/release-finalize-stable.mjs` and `scripts/release-finalize-stable.test.mjs`
- `scripts/release-package-stable.mjs` and `scripts/release-package-stable.test.mjs`
- `scripts/release-policy-contract.test.mjs`
- `scripts/release-stable-abandonments.json`

Historical FINALIZE requires every selected annotated tag and non-draft, non-prerelease GitHub Release to exist already and match the historical artifact exactly. It cannot create or change either public artifact; it may mutate only a missing npm version by publishing its independently verified historical tarball. Run read-only PREFLIGHT first with the current exact `master` SHA and the older reviewed artifact SHA:

```bash
EXPECTED_SHA=$(gh api repos/{owner}/{repo}/git/ref/heads/master --jq '.object.sha')
ARTIFACT_SHA='<full lowercase historical reviewed artifact SHA>'
[[ "$EXPECTED_SHA" =~ ^[0-9a-f]{40}$ ]] || exit 1
[[ "$ARTIFACT_SHA" =~ ^[0-9a-f]{40}$ ]] || exit 1
test "$EXPECTED_SHA" != "$ARTIFACT_SHA"

gh workflow run release-stable.yml --ref master \
  -f projects="$PROJECTS" \
  -f publish_only=false \
  -f preflight_only=true \
  -f expected_sha="$EXPECTED_SHA" \
  -f artifact_sha="$ARTIFACT_SHA"
```

Wait for PREFLIGHT to succeed and confirm exact existing tag/Release state for every selected record. Only then dispatch protected FINALIZE with the same selection and SHAs:

```bash
gh workflow run release-stable.yml --ref master \
  -f projects="$PROJECTS" \
  -f publish_only=true \
  -f preflight_only=false \
  -f expected_sha="$EXPECTED_SHA" \
  -f artifact_sha="$ARTIFACT_SHA"
```

> **Reviewed abandonment:** `@effectify/prisma@1.1.14` at artifact `f31390ce66ea157ea8b75f5259c203123e269759` keeps its exact tag and GitHub Release but must remain absent from npm because its CLI/export paths are broken. Do not publish it; a separately reviewed `@effectify/prisma@1.1.15` is required.

### Failure handling

npm reconciliation is bounded. Publication failures expose only a redacted, allowlisted diagnostic classification—authentication, authorization, not found, conflict, rejected payload, rate limiting, registry service failure, forbidden interactive authentication, or unknown—plus the bounded-read outcome; raw npm output is not emitted. A diagnostic never relaxes the external trusted-publisher requirement: npm must still bind this repository, `.github/workflows/release-stable.yml`, and the `stable-release` environment.

**Stop immediately** on a moved `master`, changed selection, missing or invalid first parent, unexpected diff path, non-beta source, target other than the beta base, package rename, malformed external response, lightweight or wrong-target tag, conflicting Release, stable collision, or an existing npm version whose `latest` differs.

Retry only the same exact SHAs and selected subset. Before a release PR merges, rollback is limited to abandoning the prepared branch or closing the PR. After merge but before public artifacts, use a protected revert PR. After any public tag or Release exists, never delete, retarget, unpublish, deprecate, or rewrite it. Do not edit or revert that public state, and do not use a repository revert to undo it; recover forward only through the same authorized FINALIZE.

## Residual GitHub-host assumptions

The policy assumes GitHub correctly enforces job-scoped permissions, protected-environment reviewer rules, branch protection, masking of the job token, and exact workflow/commit checkout semantics. The one-source-commit gate additionally assumes GitHub's `pull_request` head ref, head SHA, and base SHA identify the current PR comparison, emits a fresh required check after head changes, and prevents merge when that check is stale or bypassed. Action references currently use reviewed moving major tags and are not immutable; this remains a supply-chain risk unless and until repository-wide commit-SHA pinning is adopted. It also assumes npm trusted publishing validates the repository, workflow filename, environment, and OIDC claims, and that the hosted npm CLI supports trusted publishing. These are host trust assumptions, not guarantees created by a locally unspoofable gate.
