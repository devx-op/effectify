# Tasks: App Builder Protocol Contracts — Non-Applicable Sub-Roadmap

Never apply or record apply-progress here; this is delivery routing only. Each child owns its SDD lifecycle.

## Review Workload Forecast

| Field                   | Value                                             |
| ----------------------- | ------------------------------------------------- |
| Estimated changed lines | 4,000–6,000 program; 2,000–3,000 per remaining PR |
| 400-line budget risk    | High                                              |
| Chained PRs recommended | Yes                                               |
| Suggested split         | declarations → replay certification               |
| Delivery strategy       | ask-on-risk                                       |
| Chain strategy          | feature-branch-chain                              |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

| Unit | Goal / target                              | Focused test / runtime / receipt                                                                                                         | Rollback boundary                              |
| ---- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1    | Declarations; base = tracker PR #93 branch | `pnpm nx run @effectify/app-builder-contracts:test`; runtime: browser-neutral declaration import; receipt base/head, files, +/-, results | descriptors + declarations/projection          |
| 2    | Replay certification; base = Unit 1 branch | same test; runtime: browser import + compatibility decode; same receipt                                                                  | passive records/replay + exports/certification |

Child PRs require an issue first, conventional work-unit commits, a clean child-only diff, and reviewable chain context. Recount after every work unit: 2,000–3,000 uses the approved exception; above 3,000 stop before publication, invoke `ask-on-risk`, and reforecast/revise artifacts. No PR, issue, child artifact, code, commit, push, or publication is created by this roadmap.

## Phase 1: Published Historical Grandchildren

- [x] 1.1 **PR #94 `app-builder-contract-identities-envelopes`** — published/unchanged; identities/envelopes and typed rejection. Trace: Versioned identity; PE1.
- [x] 1.2 **PR #96 `app-builder-contract-json-canonicalization`** — published/unchanged; JSON/canonical identities and hostile rejection. Trace: JSON canonical identity; PE2.
- [x] 1.3 **PR #98 `app-builder-contract-diagnostics-outcomes`** — published/unchanged; diagnostics/exhaustive outcomes. Trace: Exhaustive outcomes; PE1.

## Phase 2: Remaining Applicable Change 1 — Declarations

- [ ] 2.1 **`app-builder-contract-declarations`** — deps: #94 → #96 → #98; publish before Unit 2. Scope trace: neutral pure boundary; explicit JSON capability/constraint descriptors with phantom, encoded-absent `R`; typed `Declaration<I,O,E,R>`; JSON-only `ToolDescription` with identity/version, schema metadata, class/capabilities/permissions/resumability/idempotency; typed mismatch/duplicate rejection; never handlers/codecs/services.
- [ ] 2.2 Child strict TDD: RED descriptor serialization/type proofs → GREEN `src/requirement.ts` → REFACTOR; then RED channel/projection/mismatch/duplicate tests → GREEN `src/tool.ts` → REFACTOR, recording commands. Verify Nx test/typecheck/lint/build receipts. Rollback: revert this coupled PR only; it remains private and owns no final exports.

## Phase 3: Remaining Applicable Change 2 — Replay Certification

- [ ] 3.1 **`app-builder-contract-replay-certification`** — dependency: published declarations. Scope trace: frozen JSON-only `src/passive-record.ts`, `src/replay.ts`, `src/digest.ts`; ordered plans, pinned inputs, baselines, provenance, validations, callbacks, continuations, replay expectations, canonical identity, external hashing only.
- [ ] 3.2 Child strict TDD: RED immutability/order/equal-identity tests → GREEN/REFACTOR records; then RED declared-minor acceptance and major/tag/duplicate/schema-mismatch, export-map, and no-Node browser-import tests → GREEN/REFACTOR `src/compatibility.ts`, `src/index.ts`, `package.json`, `project.json`, and TS entries. Publish ESM/types with Effect peer, `npm:public`, `scope:app-builder`, `layer:contracts`, `runtime:neutral`, `visibility:public`. Verify Unit 2 receipt. Rollback: revert this coupled PR; to revert declarations later, revert this first.

## Phase 4: Tracker Closure

- [ ] 4.1 After both new grandchildren are published with PASS receipts, merge the complete grandchild chain into tracker PR #93; parent remains non-applicable.

Completion rule: historical PRs #94/#96/#98 stay published; both new grandchildren must publish before tracker merge. Engram mirror: `sdd/app-builder-protocol-contracts/tasks`.
