# Design: Protected Stable Promotion

## Technical Approach

Replace stable’s direct release with one manual workflow whose exact resolver emits `prepare` when `publish_only=false`, and `finalize` only when `publish_only=true` plus a lowercase 40-character `expected_sha`. Both modes require the same duplicate-free, sorted seven-project incident set. PREPARE generates reviewable files; protected review authorizes the merge; beta structurally suppresses that exact merge; FINALIZE reconciles exact-SHA public state.

## Architecture Decisions

| Decision                                                                                                                                | Alternatives                                | Rationale                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Reuse beta’s shell state-machine pattern in existing workflows                                                                          | New coordinator, action, schema, or service | Keeps four-file scope and existing operational conventions.                                   |
| Invoke `pnpm nx release version patch "--projects=$PROJECTS" --git-commit=false --git-tag=false --git-push=false --stage-changes=false` | Aggregate release or custom versioner       | Installed Nx 23.1.1 accepts positional `patch`; every git side effect is explicitly disabled. |
| Hard-code and sorted-compare the seven name/source/target/path records                                                                  | General subset promotion                    | The normative incident is all-or-nothing and must not recalculate versions.                   |
| Collect all external state before mutation, then tags → Releases → npm                                                                  | Opportunistic per-package mutation          | Conflicts fail before changes; retries converge without rewriting identity.                   |

## Data Flow

```text
workflow_dispatch → resolver/matrix gate
  prepare → current-master + tests → Nx files → exact diff/ref checks
          → one commit → release/stable-<source-sha12> → manual protected PR
          → master push → beta exact structural classifier → suppress
  finalize(expected_sha) → HEAD/origin/matrix gate → collect tags/Releases/npm
          → atomic annotated tags → stable Releases → missing-only npm → verify
```

PREPARE snapshots heads/tags before Nx, requires exactly `CHANGELOG.md` plus the seven specified manifests, validates each authorized beta→stable-core transition, stages via a generated pathspec, commits `chore(release): prepare stable from <full-source-sha> [skip release]`, checks a clean tree, and pushes only `HEAD:refs/heads/release/stable-<sha12>`. It has `contents: write` but no npm credential.

Beta suppression compares the merge base-to-head path set and old/new manifest values against the complete authorized matrix. Exact match suppresses; partial, mixed, extra-path, malformed, or message-only release shapes fail closed.

FINALIZE fetches master without tags and requires `HEAD == origin/master == expected_sha`. It reconstructs stable records from manifests, then collects every npm version history and `latest`, exact direct/peeled remote tag ref, and GitHub Release. Existing versions require matching `latest`; missing versions form the publish subset. Existing tags must be unique annotated tags peeled to the SHA; missing tags are atomically pushed with explicit tag-only refspecs. Releases must be non-draft/non-prerelease; missing ones use `gh release create --verify-tag --generate-notes`. Nx publishes the missing subset without `--tag`, with provenance. Post-publish npm reads retry at most six times with ten-second waits; exhaustion fails and reports remaining mismatches.

Every guarded failure emits `::error::`; summaries report mode, projects, source/expected SHA, branch, versions, paths, reconciliation counts, and the next operator action without secrets.

## File Changes

| File                                       | Action | Description                                                                      |
| ------------------------------------------ | ------ | -------------------------------------------------------------------------------- |
| `.github/workflows/release-stable.yml`     | Modify | Resolver, gates, PREPARE, exact-SHA FINALIZE, credentials, annotations, summary. |
| `.github/workflows/cd.yml`                 | Modify | Exact stable structural suppression and suspicious-shape rejection.              |
| `scripts/release-policy-contract.test.mjs` | Modify | Mutation-resistant workflow, matrix, ordering, channel, and retry contracts.     |
| `.github/SETUP.md`                         | Modify | Protected procedure, matrix, stop/retry/rollback and channel policy.             |

## Interfaces / Contracts

Inputs remain `projects`, `publish_only`, and `expected_sha`; `expected_sha` is required only for FINALIZE. Outputs are internal step outputs: `mode`, `projects`, `source_sha`, `branch`, `versions`, and `changed_paths`. No new dependency or persisted schema is introduced.

## Testing Strategy

Contract tests parse workflow steps and assert exact mode/project/SHA gates, command flags and ordering, path/ref invariants, credential isolation, stable Release metadata, default npm publication, bounded rereads, and alpha/beta/stable channel isolation. Adversarial fixtures mutate duplicate/partial matrices, paths, SHAs, tag forms/targets, Release flags, npm `latest`, command ordering, and suppression messages.

## Threat Matrix

| Boundary                 | Applicability                                                  | Safe/failure behavior and planned RED test                                                                                                                       |
| ------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation-like paths | N/A: no executable classification.                             | No test.                                                                                                                                                         |
| Git repository selection | N/A: checkout cwd is authoritative; no `git -C` or path input. | No test.                                                                                                                                                         |
| Commit state             | Applicable                                                     | Stage only exact pathspec; fail on extra staged/unstaged/untracked state. RED: injected staged and untracked paths.                                              |
| Push state               | Applicable                                                     | Permit one explicit stable branch refspec and one atomic explicit tag-refspec push; reject tracking/first-push ambiguity. RED: branch/tag destination mutations. |
| PR commands              | N/A: PR creation remains manual.                               | Contract rejects `gh pr`/`gh issue` automation.                                                                                                                  |

## Migration / Rollout

Land all four files atomically. Before merge, abandon branch/PR; after merge and before artifacts, use a protected revert PR; after any artifact, retry only the same FINALIZE and never delete, retarget, unpublish, or independently repair `latest`.

## Open Questions

None.
