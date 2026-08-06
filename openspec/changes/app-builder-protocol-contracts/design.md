# Design: App Builder Protocol Contracts

## Technical Approach

Keep `app-builder-protocol-contracts` as a non-applicable roadmap and finish the existing private, browser-neutral `@effectify/app-builder-contracts` package through exactly two applicable child changes. PRs #94 (identities/envelopes), #96 (JSON/canonicalization), and #98 (diagnostics/outcomes) remain immutable history. The product architecture stays schema-first: runtime declarations retain Effect codecs and typed channels; wire descriptions and replay records contain frozen JSON only; no execution, mutation, persistence, or compatibility solving is introduced.

```text
#94 → #96 → #98 → declarations published → replay certification published → both verified → tracker PR #93 eligible
```

Replay certification MUST NOT begin implementation, complete, or publish before declarations is published. Tracker PR #93 MUST remain open until both children are published and verified; merging it never makes the parent roadmap applicable.

## Architecture Decisions

| Option                                 | Tradeoff                                                     | Decision                                                                                           |
| -------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Two consolidated children              | Larger reviews, fewer cross-change seams                     | Accepted under the explicit 3,000-line ceiling; preserve the approved internal order.              |
| Publish exports in declarations        | Exposes a surface whose replay types are absent              | Rejected. Declarations leaves `package.json` private and owns no final barrel/subpath publication. |
| Publish once in replay certification   | Delays consumer access but prevents an incomplete public API | Chosen; final exports expose only independently complete modules.                                  |
| Independent rollback of internal seams | Finer recovery but contradicts approved consolidation        | Rejected; each child is one coupled rollback unit.                                                 |

## Ownership and Work Units

| Child / strict-TDD seam                                                     | Owned files and end state                                                                                                                                                                                                                                                                                                                             | Atomic work-unit commit                                                                                |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `app-builder-contract-declarations` / 1. requirement descriptors            | Create `src/requirement.ts` and descriptor type/runtime tests. Explicit JSON capability/constraints plus phantom invariant `R`; no service reflection or grants.                                                                                                                                                                                      | RED descriptor serialization/type proofs → GREEN/REFACTOR → commit tests with implementation.          |
| declarations / 2. declaration and projection                                | Create `src/tool.ts`, projection failures, and tests. `Declaration<I,O,E,R>` preserves codecs/channels; `ToolDescription` carries encoded-side schema metadata, never handlers/codecs/`R`.                                                                                                                                                            | RED channel/projection/mismatch/duplicate tests → GREEN/REFACTOR → commit as the child’s closing unit. |
| `app-builder-contract-replay-certification` / 1. passive records and replay | Create `src/passive-record.ts`, `src/replay.ts`, `src/digest.ts` and tests. Ordered frozen plans, callbacks, continuations, provenance, validations, and replay expectations remain data only.                                                                                                                                                        | RED immutability/order/equal-identity tests → GREEN/REFACTOR → commit tests with implementation.       |
| replay certification / 2. exports, browser, compatibility                   | Create `src/compatibility.ts`, `src/index.ts`, export/browser/compatibility tests; modify `package.json`, `project.json`, and TS build entry points. Publish complete ESM types/import/default exports with no Node condition, Effect as peer, and `npm:public`, `scope:app-builder`, `layer:contracts`, `runtime:neutral`, `visibility:public` tags. | RED unsupported-version/export/browser tests → GREEN/REFACTOR → closing certification commit.          |

Leaves import concrete sibling modules, never `index.ts`. Declarations owns descriptor/declaration semantics; replay certification may consume but not redefine them. Existing #94/#96/#98 files change only when a compile-safe import is unavoidable; behavior and published commits remain unchanged.

## Data Flow and Contracts

```text
Effect codecs + explicit requirements → Declaration → pure projection → JSON ToolDescription
Passive records → canonical replay material → canonical text/identity → external hashing
Public import → compatibility check → typed accept/reject (never fallback)
```

Projection validates encoded wire JSON and schema identity/version. Replay preserves array order and delegates hashing to consumers; this package imports no crypto. Compatibility accepts only declared protocol/schema minors and returns typed failures for unknown majors, tags, duplicates, or mismatches.

## Verification and Admission

Each seam records the failing RED command and output, passing GREEN result, and REFACTOR rerun. Each child publishes only after clean `pnpm nx run @effectify/app-builder-contracts:test`, `pnpm nx run @effectify/app-builder-contracts:typecheck`, `pnpm nx run @effectify/app-builder-contracts:lint`, and `pnpm nx run @effectify/app-builder-contracts:build` evidence; declaration type proofs, canonical fixtures, hostile-input failures, exact export-map assertions, and a browser/no-Node import guard are mandatory. The PR receipt records base/head SHAs, changed files, additions+deletions, commands, and results.

Forecast at child start and recount after every work unit. A 2,000–3,000-line PR uses the approved exception. Above 3,000, stop before publication, invoke `ask-on-risk`, and reforecast/revise design, spec, and tasks before any newly approved split or exception. No partial public API may straddle that decision.

## Rollback, Threats, and Open Questions

Revert replay certification as one unit to restore the private declarations state. To revert declarations after replay publication, revert replay certification first, then declarations. Never split paired contents or rewrite #94/#96/#98. No data migration exists.

Threat matrix: N/A — the product adds no routing, shell, subprocess, VCS/PR automation, executable classification, or process-integration boundary; PR gates are delivery governance only.

Open questions: None.
