# Tasks: App Builder Run Execution CLI Tracker

## Review Workload Forecast

| Grandchild                       | Estimated changed lines | 3,000-line risk | PR boundary                          |
| -------------------------------- | ----------------------: | --------------- | ------------------------------------ |
| `app-builder-run-lifecycle`      | Historical actual | Complete | Evidence retained |
| `app-builder-run-store-recovery` | Historical actual | Complete | Evidence retained |
| `app-builder-run-lock-executor`  | Historical actual | Complete | Evidence retained with finalization |
| `app-builder-execution-cli`      | N/A | Superseded | MUST NOT apply |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
3,000-line budget risk: Low

Delivery strategy: no tracker apply. PR #104 remains a no-merge integration tracker. Completed child evidence stays authoritative; only the pending thin CLI route is superseded.

> **NON-APPLICABLE TRACKER — NEVER APPLY.** This roadmap has no runtime tasks. Unchecked routing items authorize no child lifecycle or mutation.

## Dependency Gate

`app-builder-protocol-contracts` → lifecycle → store/recovery → lock/executor/finalization → POSIX/executable foundation → `app-builder-golden-monorepo`. Retained foundations are prerequisites consumed by the Golden. The Golden proposal authorizes no specs, design, tasks, or implementation.

## Grandchild Roadmap

- [x] **1. `app-builder-run-lifecycle`** — Completed and archived. Preserve its lifecycle/approval authority, completed task checkboxes, verification, archive report, and PR #106 traceability unchanged.

- [x] **2. `app-builder-run-store-recovery`** — Completed and archived. Preserve its 26/26 tasks, 7/7 requirements, 13/13 scenarios, crash/recovery evidence, and retained lifecycle dependency unchanged.

- [x] **3. `app-builder-run-lock-executor`** — Completed and archived with its finalization correction. Preserve 14/14 parent tasks, 7/7 requirements, 16/16 scenarios, 12/12 correction tasks, and release/cancellation evidence unchanged.

- [ ] **4. `app-builder-execution-cli` — SUPERSEDED / NON-APPLICABLE.** This pending thin CLI child is superseded by `app-builder-golden-monorepo` and MUST NOT be proposed, specified, designed, tasked, applied, or merged.

- [x] **5. Retained protocol and executable prerequisites** — Preserve completed protocol-contract child evidence and the verified POSIX/executable vertical slice (10/10 tasks, 8/8 requirements, 16/16 scenarios) unchanged. They remain prerequisites for Golden planning, not tracker work.

## Next Product-Planning Route

- [ ] Continue only with separately authorized planning for `app-builder-golden-monorepo`. Its approved proposal does not authorize specs, design, tasks, implementation, branches, commits, or PRs.

## Exclusions

Applying this tracker, reviving the thin CLI child, rewriting archived/completed evidence, or starting Golden phases beyond proposal are excluded.
