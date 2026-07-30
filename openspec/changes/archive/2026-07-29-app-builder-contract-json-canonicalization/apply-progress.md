# Apply Progress: App Builder Contract JSON Canonicalization

## Status

- Change: `app-builder-contract-json-canonicalization`
- Mode: Strict TDD
- Delivery: maintainer-approved `size:exception`; one grandchild PR on `feat/app-builder-contract-json-canonicalization`, using the `feature-branch-chain` from base PR #94 (tracker #93, platform #92, issue #95).
- Completion: 12/12 tasks checked in `tasks.md` (1.1–1.6, 2.1–2.4, and 3.1–3.2).
- Native attempt: `apply-json-canonicalization-20260729-01`, ordinal 1 of 2, began and finished with outcome `passed`. No reset, extra attempt, commit, push, PR, merge, or rebase was performed.
- Begin revision: `sha256:40afeb19af80f5de46debf9a143491863f510259603044bbff30f586ec3a4627`
- Final runtime revision: `sha256:6b6f20dc7de48a12b95f188bb4bcb9f2cefe61b81c40e82606705e6a921ac267`
- Changed lines: 966/1700.
- Evidence revision: `sha256:13b65722c422b3909aa40674c8136a523a1fd63709381c1e8501c0e19c50ee68` (ordered path-and-content SHA-256 over the eight changed implementation/test files).

## Completed Tasks

- [x] 1.1–1.6 Guarded normalization, trusted-prototype snapshot, typed finite failures, iterative copy/freeze, and R1/R2 fixtures.
- [x] 2.1–2.4 `/1` canonical material/text, iterative serializer, direct RFC 3629 bytes, and R3/R4 fixtures.
- [x] 3.1–3.2 Eight-leaf private inventory and R5 neutrality/scope checks.

## TDD Cycle Evidence

| Task | Test layer | RED evidence                                                                                                                                                                                        | GREEN evidence                                                                                                                                                                    | REFACTOR evidence                                                                                                             |
| ---- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1.1  | Unit       | `pnpm nx run @effectify/app-builder-contracts:test -- tests/json.test.ts tests/json-hostile-input.test.ts` exited 1: both files had 0 tests because `../src/json.js` did not exist.                 | Same focused command exited 0: 2 files, 8 tests passed.                                                                                                                           | Iterative traversal retained helperized guarded inspection, frame, and freeze boundaries; focused command remained 8/8 green. |
| 1.2  | Unit       | Same Unit 1 RED command exited 1: hostile fixture could not import the missing normalizer.                                                                                                          | Same focused command exited 0: descriptor/key/prototype trap, accessor, symbol, hole, extra, class, and scalar cases passed.                                                      | Sparse-array fixture was expressed through explicit length/index writes; focused command remained 8/8 green.                  |
| 1.3  | Unit       | Same Unit 1 RED command exited 1: no factory export existed.                                                                                                                                        | Same focused command exited 0: configured foreign root succeeds; forged null-root constructor stays unread; options snapshot and frozen boundary hold.                            | No behavior change after direct identity-list closure review; focused command remained 8/8 green.                             |
| 1.4  | Unit       | Unit 1 RED import failure above preceded `JsonFailure`.                                                                                                                                             | 8/8 Unit 1 tests pass with direct `new JsonFailure({ reason })` failures and six `Schema.Literals` reasons.                                                                       | No refactor needed beyond shared failure constructor.                                                                         |
| 1.5  | Unit       | Unit 1 RED import failure above preceded `makeJsonNormalizer`.                                                                                                                                      | 8/8 Unit 1 tests pass; typecheck also exits 0.                                                                                                                                    | Replaced an over-generic generator inference path with explicit `Result` branch handling; tests stayed green.                 |
| 1.6  | Unit       | Covered by the Unit 1 RED seam.                                                                                                                                                                     | Unit 1 focused command exits 0: 8/8.                                                                                                                                              | Helpers preserve descriptor-before-read, raw UTF-16 record sorting, cycle-before-depth, and bottom-up freeze.                 |
| 2.1  | Unit       | `pnpm nx run @effectify/app-builder-contracts:test -- tests/canonical-json.test.ts tests/canonical-utf8.test.ts` exited 1: both files had 0 tests because `../src/canonical-json.js` did not exist. | Unit 2 focused command exits 0: canonical text/material fixtures pass.                                                                                                            | Iterative value/text work stack remains private and behavior-preserving.                                                      |
| 2.2  | Unit       | Same Unit 2 RED command exited 1: missing canonical module.                                                                                                                                         | Unit 2 focused command exits 0: exact U+FEFF/lone-surrogate byte and fresh-allocation fixtures pass.                                                                              | Direct code-point length/encode helpers remain private; no wrapper encoding added.                                            |
| 2.3  | Unit       | Unit 2 RED import failure above preceded the boundary implementation.                                                                                                                               | `pnpm nx run @effectify/app-builder-contracts:test -- tests/canonical-json.test.ts tests/canonical-utf8.test.ts tests/internal-imports.test.ts` exits 0: 3 files, 8 tests passed. | Added a type-safe readonly-array guard without changing serializer output; focused command stayed 8/8 green.                  |
| 2.4  | Unit       | Covered by the Unit 2 RED seam.                                                                                                                                                                     | Unit 2 focused command exits 0: 8/8.                                                                                                                                              | Serializer/UTF-8 helpers remain acyclic and private; no shared downstream contract added.                                     |
| 3.1  | Unit       | `pnpm nx run @effectify/app-builder-contracts:test -- tests/internal-imports.test.ts` exited 1: inventory imported missing private leaves.                                                          | Same command exits 0: 1 file, 2 tests passed.                                                                                                                                     | R5 digest/replay checks scope only the new canonicalization leaves so inherited identity digest contracts remain untouched.   |
| 3.2  | Unit       | Covered by the R5 inventory RED seam.                                                                                                                                                               | Final package test exits 0: 9 files, 26 tests passed.                                                                                                                             | Inventory is exactly eight private kebab-case leaves; no barrel/config/docs/export change.                                    |

## Work Unit Evidence

| Work unit                     | Focused test result                                                                                                                                                         | Runtime harness                                                                                                                   | Rollback boundary                                                                                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guarded normalization         | `pnpm nx run @effectify/app-builder-contracts:test -- tests/json.test.ts tests/json-hostile-input.test.ts` → exit 0; 2 files, 8 tests.                                      | N/A — this is an eager, browser-neutral, synchronous `Result` boundary with no process, network, service, or integration runtime. | Remove `src/json-failure.ts`, `src/json.ts`, `tests/json.test.ts`, and `tests/json-hostile-input.test.ts`; the parent identity/envelope leaves remain intact.       |
| Canonical material/text/bytes | `pnpm nx run @effectify/app-builder-contracts:test -- tests/canonical-json.test.ts tests/canonical-utf8.test.ts tests/internal-imports.test.ts` → exit 0; 3 files, 8 tests. | N/A — the canonical serializer/encoder is deterministic pure in-process logic; no integration boundary exists.                    | Remove `src/canonical-json.ts`, its two test files, and the inventory additions in `tests/internal-imports.test.ts`; normalization and parent leaves remain intact. |

The design threat matrix is explicitly N/A; no mapped threat cases were omitted.

## Final Verification

| Command                                                             | Result                                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm nx test @effectify/app-builder-contracts`                     | Exit 0; 9 files, 26 tests passed.                                                           |
| `pnpm nx typecheck @effectify/app-builder-contracts`                | Exit 0.                                                                                     |
| `pnpm nx lint @effectify/app-builder-contracts`                     | Exit 0; 0 warnings, 0 errors.                                                               |
| `pnpm nx build @effectify/app-builder-contracts`                    | Exit 0.                                                                                     |
| `pnpm exec oxfmt --write` on the exact eight-file Oxfmt scope below | Exit 0; completed once before final verification.                                           |
| `pnpm exec oxfmt --check` on the exact eight-file Oxfmt scope below | Exit 0; convergent/no-op.                                                                   |
| Recorded diff commands below                                        | Each recorded compound command exited 0; final hygiene checks emitted `DIFF_CHECKS_PASSED`. |

### Exact Oxfmt Scope

The Oxfmt write and check commands applied to this exact literal eight-file list:

- `packages/app-builder/contracts/src/json-failure.ts`
- `packages/app-builder/contracts/src/json.ts`
- `packages/app-builder/contracts/src/canonical-json.ts`
- `packages/app-builder/contracts/tests/json.test.ts`
- `packages/app-builder/contracts/tests/json-hostile-input.test.ts`
- `packages/app-builder/contracts/tests/canonical-json.test.ts`
- `packages/app-builder/contracts/tests/canonical-utf8.test.ts`
- `packages/app-builder/contracts/tests/internal-imports.test.ts`

The persisted apply-session commands, including their executed path order, were:

```sh
pnpm exec oxfmt --write packages/app-builder/contracts/src/canonical-json.ts packages/app-builder/contracts/src/json-failure.ts packages/app-builder/contracts/src/json.ts packages/app-builder/contracts/tests/canonical-json.test.ts packages/app-builder/contracts/tests/canonical-utf8.test.ts packages/app-builder/contracts/tests/json-hostile-input.test.ts packages/app-builder/contracts/tests/json.test.ts packages/app-builder/contracts/tests/internal-imports.test.ts
pnpm exec oxfmt --check packages/app-builder/contracts/src/canonical-json.ts packages/app-builder/contracts/src/json-failure.ts packages/app-builder/contracts/src/json.ts packages/app-builder/contracts/tests/canonical-json.test.ts packages/app-builder/contracts/tests/canonical-utf8.test.ts packages/app-builder/contracts/tests/json-hostile-input.test.ts packages/app-builder/contracts/tests/json.test.ts packages/app-builder/contracts/tests/internal-imports.test.ts
```

The write command exited 0 (`Finished in 22ms on 8 files using 14 threads`). Each of the six persisted check invocations exited 0 and reported `All matched files use the correct format.`

### Exact Diff and Worktree Command Evidence

Source: persisted `bash` receipts for `apply-json-canonicalization-20260729-01` (OpenCode session `ses_052317851ffe7qyznDXZtChYnx`). Each command below completed without an `[Exit code: N]` marker, so the recorded compound-command exit status is 0. A command containing `|| true` or the accepted no-index status guard records the compound status only. No `git worktree` command was recorded (count: 0).

1. **06:17:45 — exit 0**

   ```sh
   git log --oneline --decorate -8 && printf '\n--- dependency diff summary ---\n' && git diff --stat feat/app-builder-contract-identities-envelopes..HEAD
   ```

2. **06:18:11 — exit 0**

   ```sh
   git diff --name-only feat/app-builder-contract-identities-envelopes..HEAD && git status --short && git diff --name-only
   ```

3. **06:18:28 — exit 0**

   ```sh
   git diff --name-only feat/app-builder-contract-identities-envelopes..HEAD && git diff --name-only 1 -- openspec/changes/archive 2>/dev/null || true
   ```

4. **06:30:21 — exit 0**

   ```sh
   git diff -- packages/app-builder/contracts/src packages/app-builder/contracts/tests && printf '\n--- diff stat ---\n' && git diff --stat && printf '\n--- changed names ---\n' && git diff --name-only
   ```

5. **06:30:40 — exit 0**

   ```sh
   git ls-files --others --exclude-standard packages/app-builder/contracts && git diff --name-only && git diff --check
   ```

6. **06:33:38 — exit 0; emitted `DIFF_CHECKS_PASSED`**

   ```sh
   git diff --check feat/app-builder-contract-identities-envelopes..HEAD && git diff --check && for file in packages/app-builder/contracts/src/canonical-json.ts packages/app-builder/contracts/src/json-failure.ts packages/app-builder/contracts/src/json.ts packages/app-builder/contracts/tests/canonical-json.test.ts packages/app-builder/contracts/tests/canonical-utf8.test.ts packages/app-builder/contracts/tests/json-hostile-input.test.ts packages/app-builder/contracts/tests/json.test.ts; do git diff --no-index --check /dev/null "$file" >/dev/null || test $? -eq 1 || exit $?; done && echo DIFF_CHECKS_PASSED
   ```

7. **06:33:38 — exit 0**

   ```sh
   printf '%s\n' '--- tracked ---'; git diff --name-only; printf '%s\n' '--- untracked ---'; git ls-files --others --exclude-standard; printf '%s\n' '--- numstat tracked ---'; git diff --numstat; printf '%s\n' '--- line counts new implementation files ---'; wc -l packages/app-builder/contracts/src/canonical-json.ts packages/app-builder/contracts/src/json-failure.ts packages/app-builder/contracts/src/json.ts packages/app-builder/contracts/tests/canonical-json.test.ts packages/app-builder/contracts/tests/canonical-utf8.test.ts packages/app-builder/contracts/tests/json-hostile-input.test.ts packages/app-builder/contracts/tests/json.test.ts
   ```

8. **06:35:31 — exit 0**

   ```sh
   git status --short && printf '\n--- workspace changed names ---\n' && git diff --name-only && git ls-files --others --exclude-standard | sort && printf '\n--- parent comparison ---\n' && git diff --name-only feat/app-builder-contract-identities-envelopes..HEAD && printf '\n--- current head ---\n' && git rev-parse HEAD
   ```

9. **06:35:31 — exit 0**

   ```sh
   git diff --numstat packages/app-builder/contracts/tests/internal-imports.test.ts && wc -l packages/app-builder/contracts/src/canonical-json.ts packages/app-builder/contracts/src/json-failure.ts packages/app-builder/contracts/src/json.ts packages/app-builder/contracts/tests/canonical-json.test.ts packages/app-builder/contracts/tests/canonical-utf8.test.ts packages/app-builder/contracts/tests/json-hostile-input.test.ts packages/app-builder/contracts/tests/json.test.ts
   ```

10. **06:38:15 and 06:40:17 — exit 0; emitted `DIFF_CHECKS_PASSED` both times**

    ```sh
    for file in packages/app-builder/contracts/src/canonical-json.ts packages/app-builder/contracts/src/json-failure.ts packages/app-builder/contracts/src/json.ts packages/app-builder/contracts/tests/canonical-json.test.ts packages/app-builder/contracts/tests/canonical-utf8.test.ts packages/app-builder/contracts/tests/json-hostile-input.test.ts packages/app-builder/contracts/tests/json.test.ts packages/app-builder/contracts/tests/internal-imports.test.ts; do printf '%s\n' "$file"; cat "$file"; done | shasum -a 256 && git diff --check feat/app-builder-contract-identities-envelopes..HEAD && git diff --check && for file in packages/app-builder/contracts/src/canonical-json.ts packages/app-builder/contracts/src/json-failure.ts packages/app-builder/contracts/src/json.ts packages/app-builder/contracts/tests/canonical-json.test.ts packages/app-builder/contracts/tests/canonical-utf8.test.ts packages/app-builder/contracts/tests/json-hostile-input.test.ts packages/app-builder/contracts/tests/json.test.ts; do git diff --no-index --check /dev/null "$file" >/dev/null || test $? -eq 1 || exit $?; done && echo DIFF_CHECKS_PASSED
    ```

11. **06:38:15 and 06:40:17 — exit 0 both times**

    ```sh
    git diff --numstat packages/app-builder/contracts/tests/internal-imports.test.ts && wc -l packages/app-builder/contracts/src/canonical-json.ts packages/app-builder/contracts/src/json-failure.ts packages/app-builder/contracts/src/json.ts packages/app-builder/contracts/tests/canonical-json.test.ts packages/app-builder/contracts/tests/canonical-utf8.test.ts packages/app-builder/contracts/tests/json-hostile-input.test.ts packages/app-builder/contracts/tests/json.test.ts
    ```

12. **06:41:06 — exit 0**

    ```sh
    git status --short && printf '\n--- implementation files ---\n' && git diff --name-only && git ls-files --others --exclude-standard | sort && printf '\n--- head ---\n' && git rev-parse HEAD
    ```

## Diagnosis, Cleanup, and Process Evidence

- Diagnosis: guarded canonicalization is complete and satisfies the corrected trusted-prototype authority design without input-root inference.
- Harness disposition: N/A by design, as recorded above; unit tests execute the complete pure boundary.
- Cleanup: formatter wrote only the eight changed TypeScript files. A lint-only hostile-fixture representation adjustment followed; check mode confirmed it was already formatted, and no source-mutating shell command ran after normalization.
- Scope: implementation changes are limited to the three new private leaves, four new contract test files, and the existing private-leaf inventory. No parent/child roadmap or archived PR #1 file changed.
- Process: HEAD remains `55d5bfdd62a4c8efcb7471243213e9513a011e7a`; no forbidden GitHub/VCS delivery action occurred. Nx reports only a non-blocking advisory that the AI-agent configuration is outdated.

## Result Contract

| Field                  | Corrected fact                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Completion             | 12/12 checked tasks: 1.1–1.6, 2.1–2.4, and 3.1–3.2.                                                                                                                                   |
| Native lifecycle       | Ordinal 1 began and finished `passed`; it was not reset and no extra attempt was created.                                                                                             |
| Final runtime revision | `sha256:6b6f20dc7de48a12b95f188bb4bcb9f2cefe61b81c40e82606705e6a921ac267`                                                                                                             |
| Evidence revision      | `sha256:13b65722c422b3909aa40674c8136a523a1fd63709381c1e8501c0e19c50ee68`                                                                                                             |
| Changed lines          | 966/1700                                                                                                                                                                              |
| Oxfmt scope            | The exact eight-file literal list above; write once and persisted checks converged.                                                                                                   |
| Diff/worktree evidence | Every persisted apply-session diff command is listed above with its compound exit status; no `git worktree` command was used.                                                         |
| This correction        | Artifact-only: the runtime lifecycle remained untouched; no formatter, test/build, code/test/design/spec/proposal, checkbox, commit, push, PR, merge, or rebase action was performed. |
