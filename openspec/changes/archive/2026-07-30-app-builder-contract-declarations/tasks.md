# Tasks: App Builder Contract Declarations

## Review Workload Forecast

| Field                    | Value                                         |
| ------------------------ | --------------------------------------------- |
| Productive / total lines | ~750 / ~1,650                                 |
| 400-line risk            | High — approved >400 exception                |
| Split / strategy         | Four feature-branch-chain units / ask-on-risk |
| Stop gate                | Recount; stop and reforecast above 3,000      |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

The exception does not override the 3,000-line gate. Parent roadmap and replay certification are excluded.

### Suggested Work Units

| Unit | Goal / base                          | Focused test command                                 | Runtime harness    | Rollback boundary        |
| ---- | ------------------------------------ | ---------------------------------------------------- | ------------------ | ------------------------ |
| 1    | Requirements + R; base = tracker     | `pnpm nx run @effectify/app-builder-contracts:test`  | N/A — passive data | requirement/failure/type |
| 2    | Documents + declaration; base = PR 1 | `pnpm nx run @effectify/app-builder-contracts:test`  | N/A — no runtime   | schema/declaration       |
| 3    | Projection + firewall; base = PR 2   | `pnpm nx run @effectify/app-builder-contracts:test`  | N/A — pure Result  | projection/type/firewall |
| 4    | Evidence; base = PR 3                | `pnpm nx run @effectify/app-builder-contracts:build` | N/A — verification | tasks evidence           |

## Phase 1: Requirements and Phantom Boundary

- [x] 1.1 **RED** `tests/requirement.test.ts`: ordered frozen descriptors. **GREEN** `src/declaration-failure.ts`, `src/requirement.ts` (`decodeRequirement(s)`). **REFACTOR/check** test receipt. Rollback: both files. Trace: R1/S1.
- [x] 1.2 **RED** requirement tests: unsupported/malformed JSON plus getters, proxies, cycles, symbols, functions, depth return distinct failures. **GREEN** guarded `normalizeJson`. **REFACTOR/check** no evaluation. Rollback: requirement suite/module. Trace: R1/S2.
- [x] 1.3 **RED** `tests/tool-declaration.types.ts`: bidirectional `R` assignment rejection and encoded-key absence. **GREEN** erased `in out R` shell in `src/tool-declaration.ts`. **REFACTOR/check** `pnpm nx run @effectify/app-builder-contracts:typecheck`. Rollback: shell/proof. Trace: R3/S6.

## Phase 2: Typed Declarations and Documents

- [x] 2.1 **RED** `tests/schema-document.test.ts`: explicit I/O/E refs/documents retained; incomplete, conflicting, hostile metadata is malformed. **GREEN** `src/schema-document.ts` (`SchemaDocument`, `decodeSchemaDocument`). **REFACTOR/check** test. Rollback: document files. Trace: R2/S3–4.
- [x] 2.2 **RED** `tests/tool-declaration.test.ts`: `makeDeclaration` freezes `ToolRef`, documents, requirement order, and no handlers. **GREEN** `Declaration`/`DeclarationInput`. **REFACTOR/check** typecheck. Rollback: declaration suite/module. Trace: R3/S5–6, R1/S1.
- [x] 2.3 **RED** declaration tests: six tagged errors and no codec/annotation introspection. **GREEN** malformed/duplicate/incompatible/mismatch/projection unions. **REFACTOR/check** exhaustive `Result`. Rollback: failure/declaration files. Trace: R2/S4, R4/S8.

## Phase 3: Projection and Import Boundary

- [x] 3.1 **RED** `tests/tool-declaration-projection.test.ts`: compatible ordered declarations emit JSON only. **GREEN** `src/tool-declaration-projection.ts` (`projectDeclaration(s)`) exact ref/version/canonical-document checks. **REFACTOR/check** test. Rollback: projection suite/module. Trace: R4/S7.
- [x] 3.2 **RED** projection tests: duplicate, incompatible, mismatch, malformed, projection failures retain tags; add four-channel type equality. **GREEN** distinct pure `Result` branches. **REFACTOR/check** typecheck. Rollback: projection/type files. Trace: R4/S8, R3/S5–6.
- [x] 3.3 **RED** `tests/internal-imports.test.ts`: reject `Effect`, `Layer`, handlers/execution/evaluation, replay/certification, root exports. **GREEN** leaf allowlist. **REFACTOR/check** test. Rollback: firewall test. Trace: R5/S9.

## Phase 4: Verification and Delivery Evidence

- [x] 4.1 **RED** confirm RED receipts predate code. **GREEN** run `pnpm nx run @effectify/app-builder-contracts:test`, `:typecheck`, `:lint`, `:build`. **REFACTOR/check** record results here. Rollback: evidence only. Trace: R5/S9.
- [x] 4.2 **RED** recount detects >3,000. **GREEN** stop/reforecast or retain coupled rollback (certification first if dependent). **REFACTOR/check** clean chained bases. Rollback: delivery evidence. Trace: R5/S10.
