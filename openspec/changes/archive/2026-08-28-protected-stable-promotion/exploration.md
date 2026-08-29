# Exploration: Protected Stable Promotion

## Conclusion

Replace direct stable Nx release with the beta-proven protected state machine: PREPARE materializes only the seven stable manifests and root `CHANGELOG.md` on a dedicated `release/stable-<source-sha>` branch, a maintainer opens the required protected PR, the merge-triggered beta workflow structurally suppresses the release-shaped merge, and manual FINALIZE reconciles only artifacts for the exact merged `master` SHA. Stable FINALIZE creates non-prerelease annotated tags and GitHub Releases and publishes missing exact versions through Nx without a prerelease tag, thereby advancing npm `latest` while leaving `alpha`, `beta`, and all existing prerelease artifacts untouched.

Direct `pnpm nx release patch ... --skip-publish` is unsafe on protected `master`: repository Nx configuration enables commit, tag, and push, so the command attempts release git mutations before publication and cannot satisfy PR-only branch protection. The minimal safe boundary is to separate local release-file generation from remote artifact publication.

## Current state

- All seven release manifests currently contain the authorized beta versions, and stripping their prerelease suffixes produces the requested stable matrix exactly.
- `nx.json` defines independent projects, `{projectName}@{version}` tags, git commit/tag/push enabled, project GitHub changelogs, and collision-aware custom version actions.
- The current stable workflow validates current `origin/master`, explicit allowlisted projects, builds/tests/readiness, then directly runs Nx relative patch and publish. It has no protected-branch PREPARE/FINALIZE boundary and no exact retry reconciliation for tags, Releases, or npm.
- The beta workflow already supplies the reusable safety model: side-effect-disabled version materialization, exact changed-path checking, release branch push, structural suppression, exact-SHA FINALIZE, annotated tag identity checks, Release identity checks, missing-only npm publication, and fail-closed external reads.
- The policy contract and setup guide encode the current stable direct-release behavior and must evolve with the workflow. Alpha already publishes with `--tag=alpha`; beta publishes with `--tag=beta`; stable omits a prerelease tag and therefore targets npm’s default `latest` channel.

## Authorized promotion matrix

| Package                               | Current beta    | Required stable |
| ------------------------------------- | --------------- | --------------- |
| `@effectify/hatchet`                  | `0.1.0-beta.0`  | `0.1.0`         |
| `@effectify/node-better-auth`         | `0.5.12-beta.0` | `0.5.12`        |
| `@effectify/prisma`                   | `1.1.13-beta.0` | `1.1.13`        |
| `@effectify/react-query`              | `1.0.0-beta.1`  | `1.0.0`         |
| `@effectify/react-router`             | `0.6.0-beta.0`  | `0.6.0`         |
| `@effectify/react-router-better-auth` | `0.5.12-beta.0` | `0.5.12`        |
| `@effectify/solid-query`              | `0.5.12-beta.0` | `0.5.12`        |

The incident promotion should require the complete, duplicate-free seven-project set and compare the generated matrix byte-for-byte after sorting. Future operation may allow explicit subsets, but every selected source version must be a prerelease and every generated target must equal its semver core; stable collisions must fail rather than auto-advance.

## Minimal safe design boundary

### PREPARE

1. Manual dispatch selects PREPARE and all seven projects; resolve names through the `nx.json` allowlist and reject duplicates, omissions, or unexpected versions.
2. Check out and freshly verify current `origin/master`; run the policy contract, build, tests, and React Router readiness before materialization.
3. Create `release/stable-<12-character-source-sha>` and snapshot local refs.
4. Invoke the Nx version subcommand with the existing relative `patch` graduation semantics but explicitly disable commit, tag, push, and staging. Confirm the exact supported CLI spelling with the installed Nx version during design/apply; do not reuse the aggregate `nx release patch --skip-publish` command.
5. Require changed paths to equal root `CHANGELOG.md` plus exactly the seven selected manifests. Require each output version to equal the authorized stable matrix, contain no prerelease/build suffix, and leave every local ref unchanged.
6. Stage only the approved pathspec file, commit one release preparation commit, verify a clean tree, and push only the dedicated stable branch. PREPARE receives no npm token and performs no tag, Release, npm, issue, PR, workflow-dispatch, or `master` mutation.
7. A maintainer creates/reuses the approved issue and manually opens the linked `type:chore` PR. Ordinary checks, review, and branch protection govern merge.

### Suppression

The resulting `master` push also triggers the beta workflow. Its existing structural classifier should suppress a release-shaped merge when the only changes are `CHANGELOG.md` and release manifests whose transitions are prerelease-to-stable, while rejecting partial or suspicious shapes. Suppression must not depend only on commit text. This is the only required cross-workflow integration; stable must not dispatch beta or mutate alpha/beta artifacts.

### FINALIZE

1. Manual FINALIZE requires the complete project set and a 40-character lowercase `expected_sha`; freshly require checkout `HEAD`, fetched `origin/master`, and `expected_sha` to be identical.
2. Reconstruct records from merged manifests and require the exact stable matrix. Before mutation, read npm version histories and `dist-tags.latest`, remote exact tag refs, and GitHub Releases. Unknown, malformed, unauthorized, or conflicting reads fail closed.
3. Existing exact npm versions are acceptable only when `latest` already equals that version; otherwise treat the state as conflicting rather than moving a tag independently. Missing exact versions form the only publish retry subset.
4. Existing tags are acceptable only as unique annotated tags peeled to `expected_sha`. Create missing annotated `{name}@{stable-version}` tags locally and push only their explicit tag refspecs in one atomic tag-only push.
5. Existing GitHub Releases must match the exact tag and be non-draft and non-prerelease. Create only missing Releases with verified tags and generated notes, without `--prerelease`.
6. Publish only missing projects through `pnpm nx release publish --projects=...` with no `--tag`; npm’s default `latest` behavior is intentional. Post-verify every exact version and every `latest` dist-tag.
7. Retries are convergent: exact matching artifacts count as complete, missing artifacts continue, and conflicts stop. npm publication across seven packages is not atomic, so recovery is forward-only through the same exact FINALIZE request.

## Channel invariant

Future releases preserve channel identity by command and artifact metadata:

- Alpha versions remain prereleases and publish only with npm `--tag=alpha`.
- Beta versions remain prereleases, use annotated tags plus GitHub prereleases, and publish only with npm `--tag=beta`.
- Stable versions contain no prerelease suffix, use annotated tags plus non-prerelease GitHub Releases, and publish with no prerelease npm tag so `latest` advances.

Promotion never deletes, retargets, or rewrites prior alpha/beta package versions, dist-tags, git tags, or GitHub prereleases. Stable tags are new names because their versions omit the prerelease suffix.

## Expected implementation surface

The smallest coherent implementation is likely three existing files:

1. `.github/workflows/release-stable.yml` for PREPARE/FINALIZE and exact reconciliation.
2. `.github/workflows/cd.yml` for prerelease-to-stable structural suppression.
3. `scripts/release-policy-contract.test.mjs` for mutation-resistant stable and suppression contracts.
4. `.github/SETUP.md` for operator steps, authorized matrix, channel flow, stop conditions, and recovery.

`nx.json`, custom version actions, package source, and alpha behavior should remain unchanged unless an apply-time dry run proves Nx cannot materialize relative-patch graduation with all git side effects disabled. That uncertainty is a design checkpoint, not authorization to add custom release infrastructure.

## Risks and design checkpoints

- **Nx CLI semantics:** verify locally, without mutation, the installed Nx syntax for relative-patch stable materialization with all git side effects disabled and confirm it changes only expected paths.
- **Suppression overlap:** beta classification currently recognizes beta transitions; extending it must distinguish exact stable graduation from ordinary package edits and reject mixed/partial release shapes.
- **npm latest behavior:** omission of `--tag` should be contractually enforced; existing exact versions with a divergent `latest` tag are conflicts requiring explicit authorization, not automatic repair.
- **Partial external publication:** tags can be atomically pushed, but Releases and npm packages cannot; collect and validate all state before mutation, then reconcile in tags → Releases → npm order with post-verification.
- **Current remote state:** no remote mutation is needed during exploration. Immediately before PREPARE and FINALIZE, re-read npm histories/dist-tags, exact remote tags, Releases, and current `master`; any deviation from the authorized matrix or exact SHA stops the run.

## Out of scope

No workflow dispatch, commit, PR automation, protected-branch bypass, tag deletion/retargeting, GitHub Release mutation, npm unpublish/deprecation/dist-tag repair, alpha/beta artifact mutation, package code change, or new release service is part of this change.
