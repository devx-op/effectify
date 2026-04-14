# Hatchet Client Type Audit

## SDK/core type availability

| Client          | Category    | Prefer SDK/core types                                                                                    | Keep custom boundary types                                                     |
| --------------- | ----------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `runs.ts`       | Passthrough | `RunOpts`, `ListRunsOpts`, `ReplayRunOpts`, `RunFilter` source fields                                    | Singular `workflowName` / `status` convenience + tagged errors                 |
| `workflows.ts`  | Passthrough | `ListWorkflowsOpts`, `WorkflowTarget`                                                                    | Honest unsupported `createWorkflow` identity input + tagged errors             |
| `workers.ts`    | Passthrough | `RegisterWorkerOpts` via `HatchetClient["worker"]`, workflow item type via `Worker['registerWorkflows']` | Tagged errors + register/start lifecycle                                       |
| `ratelimits.ts` | Boundary    | `ListRateLimitsOptions`, enum re-exports                                                                 | `UpsertRateLimitOptions`, `HatchetRateLimitRecord`                             |
| `filters.ts`    | Normalized  | `ListFiltersOptions`, `CreateFilterInput`                                                                | `HatchetFilterRecord`, tagged errors                                           |
| `webhooks.ts`   | Normalized  | `ListWebhooksOptions`, `UpdateWebhookOptions`, enum-derived value unions                                 | `CreateWebhookOptions`, flattened `HatchetWebhookAuth`, `HatchetWebhookRecord` |
| `crons.ts`      | Normalized  | `CreateCronOptions`, list query field types                                                              | `workflowName` alias, `HatchetCronRecord`                                      |
| `schedules.ts`  | Normalized  | `CreateScheduleOptions`, schedule query field types                                                      | `workflowName` alias, `HatchetScheduleRecord`                                  |
| `events.ts`     | Normalized  | `PushEventOptions`                                                                                       | Event read models + tagged errors                                              |
| `logs.ts`       | Normalized  | `LogQueryOptions`                                                                                        | Tenant-log transport hiding, normalized `LogEntry` / `LogList`                 |
| `metrics.ts`    | Normalized  | SDK-derived field types for task metrics query                                                           | CamelCase query facade, normalized aggregate read models                       |

## Passthrough clients

- Prefer upstream SDK/client signatures when the wrapper forwards request shapes unchanged.
- Keep local types only when they add clear value, like singular convenience aliases, honest unsupported surfaces, or tagged errors.

## Boundary clients

- Keep custom input types when the package exposes Effect-first ergonomics the SDK does not, especially `Duration.Input`.
- Re-export upstream runtime enums when they are the real contract.

## Normalized clients

- Keep custom `*Record` read models when the wrapper guarantees required fields, parsed dates, or normalized payloads.
- Replace request/query shadows with SDK `Parameters<>` derivations wherever transport hiding does not regress DX.

## Type justification criteria

1. Prefer SDK/core types for direct passthrough request contracts.
2. Keep custom types for Effect-first boundaries like `Duration.Input`.
3. Keep custom read models when normalization guarantees stronger invariants than SDK responses.
4. Keep tagged errors for Effect-native failure channels.
5. Hide awkward transport keys (`workflow`, nested webhook auth, snake_case tenant-log params) behind package boundaries when that improves DX.
