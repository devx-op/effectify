# Exploration: Protected Beta Release Orchestration

## Conclusion

Use the existing beta workflow as a two-mode state machine: PREPARE generates a reviewable release branch without release side effects; FINALIZE publishes only the exact merged release after manual approval. This preserves PR-only `master` without a coordinator, new dependency, branch-protection bypass, or local publication.

Delivery is one implementation PR, at most 1,200 total changed lines, touching only `.github/workflows/cd.yml`, `scripts/release-policy-contract.test.mjs`, and `.github/SETUP.md`.

## Incident and invariant

Run `33125785457` generated a local commit and tags, then Nx's atomic push failed with GH006 because `master` requires PRs. No commit, tag, GitHub Release, or npm beta version reached a remote, so there is no partial publication to reconcile. Recovery must regenerate reviewed state and accept exactly:

| Package                               | Version         |
| ------------------------------------- | --------------- |
| `@effectify/react-router`             | `0.6.0-beta.0`  |
| `@effectify/react-query`              | `1.0.0-beta.1`  |
| `@effectify/node-better-auth`         | `0.5.12-beta.0` |
| `@effectify/solid-query`              | `0.5.12-beta.0` |
| `@effectify/react-router-better-auth` | `0.5.12-beta.0` |
| `@effectify/prisma`                   | `1.1.13-beta.0` |
| `@effectify/hatchet`                  | `0.1.0-beta.0`  |

## Minimal safe boundary

- PREPARE retains existing selection, policy, build/test/readiness, and collision-aware version checks. It runs `nx release version` with commit, tag, push, and staging disabled; accepts only selected beta manifests plus root `CHANGELOG.md`; and pushes one explicit release branch.
- A maintainer creates and obtains approval for the required issue, then manually opens one linked release PR whose sole `type:*` classification is `type:chore`. Normal protection and review merge it.
- The merge run is suppressed by changed-path/version structure; commit text is only defense in depth.
- FINALIZE requires explicit projects and the exact current `master` SHA. It reconciles exact annotated tags by atomic tag-only push, exact GitHub prereleases, then missing npm betas through Nx, with post-verification and fail-closed retries.

Seven npm publishes are not atomic, so exact matching artifacts count as complete, missing artifacts may continue, and conflicts or uncertain reads stop. Stable, alpha, custom release infrastructure, automated issue/PR creation, and broader platform work are out of scope.
