# Tasks: App Builder Protocol Contracts — Non-Applicable Sub-Roadmap

Parent/child apply is prohibited. This roadmap creates no grandchild artifacts, code, or apply-progress. Each named grandchild independently owns proposal → spec → design → tasks → apply → verify → archive, strict RED→GREEN→REFACTOR TDD, its review forecast/chain decision, focused-test/runtime receipts, docs, and rollback.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 2,145 (program) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Seven grandchildren |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Each grandchild owns its own forecast and PR-chain decision; this program does not authorize a chain or apply.

## Phase 1: Foundations

- [ ] 1.1 **`app-builder-contract-identities-envelopes`** — Deps: none. Scope: branded IDs, safe versions, references, common envelope foundation, typed identity failures. Terminal proof: its archived PASS with RED tests and Nx test/typecheck/lint/build receipts. Rollback owner: this grandchild only; revert its identity/envelope files. Trace: Versioned identity/Unknown protocol major; PE1.
- [ ] 1.2 **`app-builder-contract-json-canonicalization`** — Deps: identities. Scope: JSON domain, hostile-input/non-echoing failures, frozen canonical material, `effectify-cjson/1`, RFC 3629 UTF-8/no-BOM contract; hashing stays downstream. Terminal: archived PASS receipts. Rollback owner: this grandchild only; revert JSON/canonical modules. Trace: JSON value/Canonical replay comparison/Unsupported value; PE2.

## Phase 2: Parallel Contract Slices

- [ ] 2.1 **`app-builder-contract-diagnostics-outcomes`** — Deps: identities; parallel with 2.2. Scope: diagnostics, typed failures, common envelope, only Success/Failure/InputRequired outcomes. Terminal: archived PASS receipts. Rollback owner: this grandchild only; revert diagnostic/outcome modules. Trace: Exhaustive envelope outcomes; PE1.
- [ ] 2.2 **`app-builder-contract-requirement-descriptors`** — Deps: identities; parallel with 2.1. Scope: JSON capability/constraint descriptors and invariant, phantom, encoded-absent `R`; no service/permission evaluation. Terminal: archived PASS receipts. Rollback owner: this grandchild only; revert requirement modules. Trace: Explicit requirement descriptors/Serialize requirements; PE1.

## Phase 3: Projection and Replay

- [ ] 3.1 **`app-builder-contract-tool-declarations`** — Deps: JSON canonicalization, diagnostics outcomes, requirement descriptors. Scope: encoded-side schema projection, schema identities/documents, declaration metadata, I/O/E/R type channels, mismatch/duplicate failures. Terminal: archived PASS receipts. Rollback owner: this grandchild only; revert tool/projection modules. Trace: Dual tool contract/Describe a tool; PE1.
- [ ] 3.2 **`app-builder-contract-passive-records-replay`** — Deps: JSON canonicalization, diagnostics outcomes; parallel with 3.1. Scope: immutable ordered plans, callbacks, continuations, replay expectations, provenance/baselines/validations, canonical replay material and digest refs. Terminal: archived PASS receipts. Rollback owner: this grandchild only; revert passive-record/replay modules. Trace: Passive immutable replay records/Preserve replay data; PE2.

## Phase 4: Certification

- [ ] 4.1 **`app-builder-contract-exports-compatibility`** — Deps: all six above. Scope: public exports, declared compatibility, browser fixture, deterministic cross-module fixtures, type channels, docs. Terminal: archived PASS proving browser-safe exports, compatibility, fixtures, docs, build/test/lint/typecheck. Rollback owner: this grandchild only; revert export/compatibility/fixture/docs changes. Trace: Browser consumption, compatibility evolution, all child scenarios; PE1–2.

Engram mirror: `sdd/app-builder-protocol-contracts/tasks`.

Completion rule: all seven grandchildren are archived PASS; never apply this roadmap.
