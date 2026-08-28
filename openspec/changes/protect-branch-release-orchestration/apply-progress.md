# Apply Progress: Protect Branch Release Orchestration

## Status

- **Phase:** apply remediation
- **Result:** bounded verification findings closed
- **Next owner:** parent lifecycle
- **Action context:** repo-local; no workflow dispatch, commit, push, ref/tag, PR, issue, Release, or npm mutation occurred.
- **Delivery boundary:** one PR, no new file/module/dependency, 1,168 total changed lines (794 tracked implementation/docs plus 374 new OpenSpec lines), including all six artifacts and below the 1,200 ceiling.

## Remediation completed

1. **OpenSpec formatting:** pinned oxfmt formatted all six markdown artifacts. The uncommitted Nx lint command now passes without excluding or relocating them.
2. **Executable fail-closed contract:** PREPARE and FINALIZE reject heredoc ambiguity, literal statically dead wrappers, and unused shell functions. Unknown tag, conflicting npm, and unknown Release branches are each tied to their active `exit 1`; mutations neutralize those exits rather than changing diagnostics.
3. **Summary/runbook alignment:** PREPARE exports and summarizes exact selected package versions and changed paths. Workflow summary and SETUP state that the linked release PR's sole `type:*` label is `type:chore`.

Parent-owned checklists remain unchanged.

## Strict TDD evidence

| Phase       | Evidence                                                                                                                                                                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RED         | After semantic contract edits and before workflow/docs remediation, `node --test scripts/release-policy-contract.test.mjs` failed 4/14: the three named beta contracts reported heredoc/summary/sole-label violations, and SETUP lacked the sole-label statement. |
| GREEN       | Replaced the PREPARE heredoc with active `printf`, added existing-value outputs/summary fields, and aligned SETUP; the full contract passed 14/14.                                                                                                                |
| TRIANGULATE | Heredoc, `if false`, unused-function, unknown-tag-exit, conflicting-npm-exit, and unknown-Release-exit mutations are exercised against the real parsed workflow and fail closed; the full suite remains 14/14.                                                    |
| REFACTOR    | Pinned oxfmt passes for the contract, SETUP, and all six OpenSpec artifacts; no helper file or dependency was added.                                                                                                                                              |

## Validation

| Command                                                                       | Result                                                                                                      |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `node --test scripts/release-policy-contract.test.mjs`                        | PASS, 14/14.                                                                                                |
| `ruby -e 'require "yaml"; YAML.parse(File.read(".github/workflows/cd.yml"))'` | PASS.                                                                                                       |
| `pnpm nx affected --target=lint --uncommitted --parallel=1`                   | PASS for `@effectify/repo`; existing unrelated warnings were non-fatal, and changed-file formatting passed. |
| `pnpm nx affected --target=typecheck --uncommitted --parallel=1`              | PASS, no tasks selected.                                                                                    |
| `pnpm nx affected --target=build --uncommitted --parallel=1`                  | PASS, no tasks selected.                                                                                    |
| `pnpm nx affected --target=test --uncommitted --parallel=1 --passWithNoTests` | PASS, no tasks selected.                                                                                    |
| Pinned oxfmt check for the contract, SETUP, and all six OpenSpec artifacts    | PASS, 8/8 files.                                                                                            |
| `git diff --check`                                                            | PASS.                                                                                                       |

## Changed files

| File                                                                          | Remediation result                                                                                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/cd.yml`                                                    | Active matrix construction; exact version/path outputs; sole-label summary.                                   |
| `scripts/release-policy-contract.test.mjs`                                    | Executability restrictions, exact active-exit blocks, semantic adverse mutations, summary/runbook assertions. |
| `.github/SETUP.md`                                                            | Sole `type:*` label requirement.                                                                              |
| Six `openspec/changes/protect-branch-release-orchestration/**/*.md` artifacts | Pinned oxfmt; this file also records remediation evidence.                                                    |

## Work-unit boundary

- **Runtime harness:** N/A because exercising the release boundary would mutate branches, tags, Releases, or npm.
- **Rollback:** revert only `.github/workflows/cd.yml`, `scripts/release-policy-contract.test.mjs`, and `.github/SETUP.md`; OpenSpec edits are formatting/evidence only.
- **Engram:** not written because no validated project name was supplied for project-scoped memory.

## Remaining parent-owned tasks

- [ ] Create or reuse the repository-required implementation issue, obtain approval, and link the exact three-file scope and 1,200-line ceiling. <!-- sdd-owner: parent -->
- [ ] Open, review, approve, and merge exactly one implementation PR containing the single work-unit commit and its recorded checks; reject extra files, dependencies, modules, release dispatches, or a size exception. <!-- sdd-owner: parent -->
- [ ] Promote the merged implementation to protected `master` through ordinary repository policy, without dispatching beta or stable during the promotion itself. <!-- sdd-owner: parent -->
- [ ] Manually dispatch incident PREPARE with all seven exact Nx projects, then verify the reported release branch, changed paths, and authorized versions before continuing. <!-- sdd-owner: parent -->
- [ ] Create or reuse and approve the required release issue for the prepared branch, with no workflow automation applying approval. <!-- sdd-owner: parent -->
- [ ] Manually open, review, approve, and merge one generated linked `type:chore` release PR from the reported branch to `master`, then verify the resulting beta workflow run structurally suppresses preparation and publishes nothing. <!-- sdd-owner: parent -->
- [ ] Provide fresh publication authorization bound to the resulting current full `master` merge SHA as `expected_sha` and the exact seven-project selection; stop if `master` moves. <!-- sdd-owner: parent -->
- [ ] Manually dispatch `publish_only=true` with the authorized projects and fresh `expected_sha`; do not dispatch stable. <!-- sdd-owner: parent -->
- [ ] Verify all seven exact annotated tags target `expected_sha`, all seven GitHub Releases are non-draft prereleases, and npm contains the seven authorized incident versions with each `beta` dist-tag exact. <!-- sdd-owner: parent -->
