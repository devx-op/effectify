# Proposal: App Builder Executable Vertical Slice

## Intent and Current Gap

Deliver the first runnable App Builder workflow. The durable kernel exists, but its live filesystem fails closed and no Nx target proves the end-to-end workflow.

## Proposal Question Round

Maintainer decisions resolve scope; syscall integration remains for design.

## First-Slice Scope

### In Scope

- A deterministic non-interactive command using a caller-selected persistent workspace.
- An integrated auditable POSIX helper supporting macOS x64/arm64 and glibc Linux x64/arm64 without manual prerequisites.
- Offline execution after dependency installation.
- Durable draft reload; legal revisions 1–3; exact `Ready` handoff; executor-owned revision 4+ and cleanup.
- Mandatory `--approve`; absence creates no journal or workspace mutation.
- No-replace creation of `generated.txt`; an existing file fails visibly.
- Separate readable success evidence with revisions/digests; recoverable intermediate evidence plus a truthful failure report.

### Non-Goals / Deferrals

Generic resolver/approval services, advanced stale recovery, broad Config/secret matrices, prompts, JSON protocol, musl Linux, Windows, generators, registries, and plugins.

## User-Visible Outcome and Guarantees

The command either creates `generated.txt` once with auditable success evidence or fails without claiming success. Existing lifecycle, journal, lock, no-follow, durability, ownership, callback-order, and executor-cleanup guarantees remain unchanged.

## Capabilities

### New Capabilities

- `app-builder-posix-durable-filesystem`: Truthful handle-relative durable filesystem behavior on macOS x64/arm64 and glibc Linux x64/arm64.
- `app-builder-executable-operation`: Approved one-command draft-to-execution workflow and exported evidence.

### Modified Capabilities

None; existing run lifecycle, store/recovery, and lock/executor requirements are composed unchanged.

## Approach and Affected Areas

| Area                                                        | Impact                                                     |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| `packages/app-builder/execution/src/durable-file-system.ts` | POSIX adapter/helper integration                           |
| `packages/app-builder/execution/demo/`, `project.json`      | Executable command and reports                             |
| `packages/app-builder/execution/tests/`, CI workflows       | Real macOS x64/arm64 and glibc Linux x64/arm64 smoke proof |

## Supersession

This change supersedes implementation intent for `app-builder-create-operation`. Its old untracked artifacts remain comparison/audit material until an explicit cleanup or archive decision; they are not edited or applied.

## Delivery Forecast

Forecast: 1,400–2,150 changed lines. Prefer one coherent vertical PR under 3,000. If necessary, auto-chain only as POSIX adapter/conformance followed by executable workflow.

## Risks and Tradeoffs

- Native syscall portability/maintenance: keep the helper minimal, auditable, and CI-proven.
- Cleanup can hide evidence: export reports without weakening executor cleanup.
- Lock handoff races: fail closed, preserve evidence, never invoke the callback.

## Rollback and Dependencies

Revert helper, adapter, target, reports, and tests together; retain immutable evidence and existing fail-closed adapter behavior. Depends only on installed toolchains and existing execution capabilities.

## Success Criteria

- [ ] Real macOS x64/arm64 and glibc Linux x64/arm64 CI smoke runs pass fully offline after install.
- [ ] Approved runs create exactly one `generated.txt` and verifiable revision/digest evidence.
- [ ] Missing approval, existing output, and injected intermediate failure satisfy the stated no-mutation/evidence/report guarantees.
