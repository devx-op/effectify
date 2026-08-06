# Design: App Builder Run Lifecycle

## Technical Approach

Add public package `@effectify/app-builder-execution` as a deterministic lifecycle kernel. Boundary-crossing states, requests, results, prior-result material, evidence, and failures use current Effect v4 Schema; only private reducer decisions may use `Data.TaggedEnum`. `Schema.TaggedUnion` is required publicly because later children must decode/encode and exhaustively `.match` these values. One pure reducer is authoritative; one stateless service only lifts it into Effect.

## Architecture Decisions

| Decision  | Choice and rationale                                                                                                                                                                                                                                                 | Rejected                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Contracts | Reuse `Reference.{RunRef,PlanRef,ProtocolRef}`, `Version.Version`, and `Diagnostic.Diagnostic`. `PassivePlan` has a decoder/type but no exported schema, so `makeDraft` accepts the decoded type and projects `planRef`; no contract shape is copied or re-exported. | Shadow DTOs.                         |
| Counters  | Revision starts 0; evidence sequence starts 1. Novel applied requests require the current revision and compute safe-integer successors. The next child durably allocates/commits them; this child reserves nothing.                                                  | Clock, UUID, lock, global allocator. |
| Policy    | Export request/receipt values only; evaluation and rules remain external.                                                                                                                                                                                            | Registry/evaluator service.          |

## Data Flow

```text
decoded boundary -> normalize -> prior-result replay check -> revision/legal reducer
  -> exact prior result | new immutable result/evidence | unchanged waiting | typed failure
```

## Interfaces / Contracts

`Counter` is non-negative safe `Schema.Int`; request/policy/safe-point IDs are separately branded non-empty strings. `Fact={key,value}` where value is `Null|Boolean|Finite|String`; `SecretDescriptor={key,present,source}` restricts source to the safe provenance vocabulary `environment|prompt`, so it cannot contain a secret value/hash. `ContractRefs={protocolRef,planRef}` uses imported schemas.

- `PolicyRequest={requestId,policyRef,runRef,planRef,lifecycleIdempotent,facts,secrets}`; `PolicyDecision=Approved|Denied{reason}|InputRequired{reason}`; `PolicyReceipt={requestId,policyRef,decision,facts,secrets}`.
- `TransitionEvidence={sequence,previousRevision,nextRevision,from,to,cause,requestId,requestTag,facts,secrets,contracts,outcomeTag}`; no time, digest, persistence, or cleanup claim.
- Every `LifecycleSnapshot` case carries `{runRef,contracts,revision,lastSequence,history}`. Cases are exactly `Draft`, `Validated{facts}`, `WaitingForApproval{policyRequest}`, `Ready{policyReceipt}`, `Executing`, `CancellationRequested{cancellationRequestId}`, `RecoverableInterruption{safePointEvidence}`, `Succeeded`, `Failed{diagnostics}`, `Cancelled{confirmationRef}`.
- `TransitionRequest` cases are `Validate`, `RequireApproval{policyRequest}`, `ResolveApproval{receipt?}`, `AcceptExecution`, `Complete{Succeeded|Failed{diagnostics}}`, `RequestCancellation`, `ConfirmCancellation{confirmationRef}`, `RecordRecoverableInterruption{safePointEvidence}`; common fields are request ID, expected revision, cause, facts/redactions, and refs.
- `TransitionResult=Applied|WaitingForApproval|CancellationRequested|RecoverableInterruption`, each containing its exact snapshot/evidence/request material. `PriorTransitionResult={requestId,normalizedRequest,result}` is schema-decoded caller-provided material; snapshots contain evidence, not this index. `reduce({snapshot,request,priorResults})` returns an equal, detached, deeply immutable copy of `prior.result` for an equivalent replay without another transition or history append. Missing or evidence-inconsistent prior material fails `PriorResultUnavailable`/`PriorResultMismatch`; persistence is deferred.
- Failures form one closed union of `Schema.TaggedErrorClass`: those two plus `RevisionConflict`, `CounterExhausted`, `IllegalTransition`, `ConflictingDuplicate`, `ContractMismatch`, `SnapshotIntegrityFailure`.
- `RunLifecycle.Service.transition` is `Effect.fn("AppBuilder.RunLifecycle.transition")`; `layer` is `Layer.succeed`, with no `Ref`, cache, I/O, persistence, or ambient dependency.

Normalization uses exact UTF-16 key ordering, normalizes numeric `-0` to `0`, and otherwise performs no trim, case-fold, locale, or Unicode normalization. Identical duplicate fact keys or secret `{present,source}` keys collapse. Different values for one key, fact/secret classification reuse, conflicting prior entries, or the same request ID with a different normalized semantic body fail `ConflictingDuplicate{requestId,scope,key?}`. Equality uses decoded structural values; request identity and expected revision are control fields excluded from semantic-body equality. Normalization/conflict checks precede replay and revision checks.

## Legal Transition Table

| From                                                   | Request                              | To                      |
| ------------------------------------------------------ | ------------------------------------ | ----------------------- |
| Draft                                                  | Validate                             | Validated               |
| Validated                                              | RequireApproval                      | WaitingForApproval      |
| WaitingForApproval                                     | matching idempotent Approved receipt | Ready                   |
| Ready                                                  | AcceptExecution                      | Executing               |
| Executing                                              | Complete(Succeeded/Failed)           | Succeeded/Failed        |
| Draft, Validated, WaitingForApproval, Ready, Executing | RequestCancellation                  | CancellationRequested   |
| CancellationRequested                                  | ConfirmCancellation                  | Cancelled               |
| Executing                                              | proven safe-point interruption       | RecoverableInterruption |

Other novel cells fail `IllegalTransition`. Terminal states never change; `RecoverableInterruption` has no outgoing transition here. Fiber interruption is never translated into state or executor cleanup.

## File Changes and Public Surface

Create `packages/app-builder/execution/{package.json,project.json,tsconfig.json,tsconfig.lib.json,tsconfig.spec.json,vitest.config.mts,README.md}` plus `src/{lifecycle,transition-evidence,automatic-policy,failure,index}.ts` and `tests/{transition-table,lifecycle-laws,service-boundary,public-surface}.test.ts`, `tests/public-types.ts`. `package.json` sets name `@effectify/app-builder-execution`, `type:module`, dependencies `tslib:catalog:` and `@effectify/app-builder-contracts:workspace:*`, peer `effect:catalog:`, catalog dev dependencies `@effect/vitest`, `@types/node`, `typescript`, `vitest`, and exactly `exports:{".":{"@effectify/source":"./src/index.ts","types":"./dist/src/index.d.ts","import":"./dist/src/index.js","default":"./dist/src/index.js"}}`. `project.json` sets source root `packages/app-builder/execution/src`, output `packages/app-builder/execution/dist`, tags `["app-builder","public","execution"]`, build main `src/index.ts`/`tsconfig.lib.json`, and contracts-equivalent typecheck/test/test-coverage/lint targets. `src/index.ts` exports exactly four namespaces: `RunLifecycle`, `TransitionEvidence`, `AutomaticPolicy`, `LifecycleFailure`; a surface test asserts that key allowlist and the single root export.

## Testing Strategy

Strict RED→GREEN→REFACTOR begins with every state × request cell and failure tag. RED also decodes an unknown snapshot `_tag`, asserts schema failure, and proves no reducer call/result. Table/property proofs cover counters, one append, immutability, exact prior-result replay, all duplicate-key classes, terminal closure, deterministic same-snapshot concurrency, and service interruption via `Exit`/`Cause`; no sleeps, files, process, globals, persistence mocks, or casts.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration. Rollback removes this additive package. Persistence, locks, executor, CLI, Nx generation, web, plugins, and analytics remain outside this child.

## Open Questions

None.
