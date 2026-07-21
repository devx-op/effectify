# Design: Hatchet Declarative Task API

## Technical Approach

Create a clean sibling worktree from the existing tracker base, cherry-pick `b3554662` then `0e6a8302`, and assert each replay changes only `packages/hatchet/**`. Add scoped completion commits there; never apply the backup patch or copy React Router files. The package keeps immutable Effect-owned declarations at its public boundary, validates once before SDK registration, maps through internal adapters, and dispatches ordinary and durable callbacks through one live registry.

All source-mutating normalizers run before exactly one new receipt-driven review. That review alone may authorize delivery; `review-ecff39feff9d2cff` and `review-517abc7c361506f0` remain immutable evidence. This uses the approved single-PR, 5,000-line one-time exception.

## Architecture Decisions

| Decision                                                                               | Alternatives                               | Rationale                                                                                  |
| -------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Clean worktree plus ordered cherry-picks                                               | Patch backup; edit dirty tracker           | Preserves commit provenance and excludes known drift.                                      |
| Package-owned `Task`, `RateLimit`, and `Trigger` values; SDK types stay internal       | Re-export SDK declarations                 | Maintains an Effect-first stable boundary and local validation semantics.                  |
| One heterogeneous registry stores ordinary and durable runners with captured `Context` | Separate registries; callback-local lookup | Gives durable/live dispatch one source of truth while containing type erasure internally.  |
| Typed package errors for declaration, schema, missing-task, and SDK failures           | Throw adapter errors                       | Keeps expected failures in Effect channels and preserves diagnostic operation/task fields. |

## Data Flow

    Task declaration -> declaration validation -> SDK mapping -> worker registration
           |                                              |
           +-> registry + captured Context <- live callback/durable invocation
                                      |
                         decode -> execute -> encode/error map

Durable callbacks construct `Task.DurableContext` from SDK metadata, including `invocationCount` and interruption. Unknown names fail with `MissingTaskError`; input/output codec failures become `TaskSchemaError`; SDK acquisition/worker failures become classified package errors. Worker shutdown remains scoped and preserves interruption.

## File Changes

| File                                                                                                          | Action        | Description                                                                         |
| ------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------- |
| `packages/hatchet/src/{Task,RateLimit,Trigger,Error,index}.ts`                                                | Modify/Create | Public immutable declarations, durable types, errors, root namespace exports.       |
| `packages/hatchet/src/internal/{declaration-validation,sdk-declaration,registry,live}.ts`                     | Modify/Create | Pure validation, exact SDK translation, durable storage and live callback dispatch. |
| `packages/hatchet/tests/types/declarative-task-api.ts`                                                        | Modify        | Compile-time inference, requirements, durable context, and exports.                 |
| `packages/hatchet/tests/unit/{rate-limit,trigger,live-sdk-port,task-core,public-api-source-contract}.test.ts` | Modify        | Runtime validation, mapping, dispatch, schema/error, and surface evidence.          |
| `packages/hatchet/README.md`                                                                                  | Modify        | Supported declarative API and failure/lifecycle behavior.                           |

No `apps/react-router-example/**` or backup-recovery file may change.

## Interfaces / Contracts

`Task.Declaration<R>` accepts ordinary or durable tasks. Registry entries retain declaration kind and expose an unknown-input runner; this is the only heterogeneous erasure seam. `Hatchet.layer({ tasks })` validates duplicate names, metadata, rate limits, and triggers before creating SDK declarations. `sdk-declaration.ts` alone translates event/cron triggers, rate-limit keys/durations, ordinary `task` versus durable SDK registration, and callback context.

## Testing Strategy

| Layer       | What to Test                                           | Approach                                                                                  |
| ----------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Type        | Public inference/exports                               | Package typecheck fixtures with positive and `@ts-expect-error` contracts.                |
| Unit        | Validation, mapping, registry                          | `@effect/vitest` effects; direct typed-failure and exact SDK-shape assertions.            |
| Integration | Lazy worker registration and ordinary/durable dispatch | Fake SDK worker, captured callbacks, deterministic interruption/finalization; no sleeps.  |
| Delivery    | Provenance and receipt gates                           | Assert replay paths, forbidden-path absence, ordered normalizers, and receipt validation. |

## Threat Matrix

| Boundary                 | Applicability                              | Safe/failure behavior and planned RED tests                                                                                                                |
| ------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation-like paths | N/A — no executable classification changes | No task.                                                                                                                                                   |
| Git repository selection | Applicable                                 | Commands bind an absolute clean-worktree cwd; RED: relative/wrong cwd rejected, absolute intended cwd accepted.                                            |
| Commit state             | Applicable                                 | Replay/commit requires expected index and clean unrelated worktree; RED: staged drift, `commit -a`, and empty index fail safely.                           |
| Push state               | Applicable                                 | Receipt authorizes resolved tracker ref only; RED: tracking, first-push, and explicit-refspec destinations resolve identically or stop.                    |
| PR commands              | Applicable                                 | One PR uses explicit head and receipt-owned command composition; RED: explicit head accepted, environment prefix/composed command cannot bypass ownership. |

## Migration / Rollout

No data migration. Commit sequence: two immutable replay commits, focused API/runtime/test/docs completion commits, normalizer commit(s), then one new review receipt. Validate receipt pre-commit, pre-push, and pre-PR and follow native `next_action`; any denial stops. Roll back completion commits, then replay commits in reverse order without altering historical lineages.

## Open Questions

None.
