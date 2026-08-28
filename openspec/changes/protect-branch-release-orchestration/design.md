# Design: Two-Mode Beta Release Workflow

## Boundaries

One implementation PR (maximum 1,200 total changed lines) changes only:

| File                                       | Responsibility                                                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/cd.yml`                 | PREPARE/SUPPRESS/FINALIZE orchestration inside the existing beta job.                                                             |
| `scripts/release-policy-contract.test.mjs` | Parsed static contracts and negative mutations for those boundaries; existing alpha/stable results stay unchanged.                |
| `.github/SETUP.md`                         | Maintainer prepare → approved issue → linked sole-`type:chore` PR → merge → exact-SHA finalize/retry runbook and incident matrix. |

No workflow/module/dependency is added. Stable, alpha, custom platform work, automatic issue/PR creation, branch bypass, and local publication are excluded.

## State resolution

The existing job retains triggers, concurrency, permissions, affected detection, allowlist, builds/tests, React Router readiness, collision checks, provenance, and summaries. A resolver emits one mode:

```text
master push: exact release structure -> SUPPRESS
master push: suspicious token/beta shape -> fail
master push: ordinary affected change -> PREPARE
workflow_dispatch publish_only=false: exact incident selection -> PREPARE
workflow_dispatch publish_only=true: projects + expected_sha -> FINALIZE
```

Configured projects come from `nx.json.release.projects`. For each selected project, `pnpm nx show project "$project" --json` supplies root and package identity; normalized exact-set matching rejects empty, duplicate, unknown, or substring matches.

## SUPPRESS

Before affected selection, compare base/head paths and manifest versions. Suppress only when root `CHANGELOG.md` changed, every other path is a configured manifest, and every changed manifest makes a valid `-beta.<integer>` transition. Message tokens are defense in depth: token-only evidence or beta-shaped changes with missing/unexpected paths fail. SUPPRESS performs no preparation or publication.

## PREPARE

PREPARE follows existing policy, selected build/test, readiness, and collision-aware registry gates but receives no publishing credentials. One strict shell boundary:

1. Capture source SHA and ref/tag snapshots; create `release/beta-<12-char-source-sha>` locally.
2. Run `pnpm nx release version "--projects=$PROJECTS" --preid=beta --git-commit=false --git-tag=false --git-push=false --stage-changes=false`.
3. Require beta versions and an exact sorted diff of selected manifests plus root `CHANGELOG.md`; require unchanged refs/tags. Manual incident mode also verifies all seven authorized pairs.
4. Rebuild, repeat diff/ref checks, stage only the exact set, and require an exact index with no remainder.
5. Commit `chore(release): prepare beta from <full-source-sha> [skip release]` and push only `HEAD:refs/heads/release/beta-<12-char-source-sha>` without force or tag options.

The summary reports source, branch, selected versions, and paths, then instructs a maintainer to obtain issue approval and manually open one linked PR to `master` whose sole `type:*` classification is `type:chore`. PREPARE cannot create issues, PRs, tags, Releases, npm artifacts, or update `master`.

## FINALIZE

FINALIZE runs only for manual `publish_only=true`. Require a unique non-empty allowlisted project set and a 40-character lowercase `expected_sha`. Before mutation:

1. Fetch `master` freshly and require HEAD, `origin/master`, and `expected_sha` to be identical.
2. Read package names and beta versions from selected merged manifests and derive exact `<packageName>@<version>` tags.
3. Rerun build/test/readiness and npm authentication; read complete npm history. Exact versions are complete only when `dist-tags.beta` matches; absent versions form the missing subset; unknown or conflicting state fails.

Only FINALIZE receives npm provenance/authentication and GitHub release credentials.

### Tags and GitHub Releases

Check every tag before creating one. Existing tags must be annotated and peel to `expected_sha`; missing tags are created annotated there. Push all missing tags once with `git push --atomic origin` plus explicit `refs/tags/<tag>:refs/tags/<tag>` refspecs—never branches, wildcards, `--tags`, or `--follow-tags`—then reread them.

After all tags verify, accept only GitHub Releases with the exact tag, non-draft state, and prerelease state. Create positively missing releases with `gh release create "$TAG" --verify-tag --prerelease --generate-notes`, then reread all releases. Conflicts and unknown reads stop before npm.

### npm and retry

Publish only the missing project subset with `pnpm nx release publish "--projects=$PROJECTS" --tag=beta`, then reread complete npm history and require every selected version and beta dist-tag. A retry with identical projects/manifests/SHA accepts exact tags, prereleases, and npm versions, continues missing work, never recalculates versions, and fails every conflict or uncertainty.

## Static contract and review

The dependency-free test parses active steps, commands, and conditions with comments removed. It asserts exact allowlist membership; structural suppression; all four Nx `false` flags; exact PREPARE paths/ref snapshots/index/branch push and absence of publication authority; FINALIZE input/SHA/manifest gates; annotated-tag checks and atomic tag-only push; exact prerelease commands; Nx beta publication ordering; npm post-verification/idempotence; and unchanged alpha/stable contracts. Negative mutations for each safety boundary must fail.

Review in this order: resolver/suppression, PREPARE diff and sole refspec, FINALIZE SHA/tag/Release/npm ordering, parsed tests, then SETUP's happy path, seven exact incident versions, retry/stop guidance, and instruction not to dispatch stable.
