# Exploration: App Builder Run Lifecycle

> Exploration only. This artifact does not authorize proposal, specification, design, tasks, implementation, package generation, or work on later grandchildren.

## Current State

`@effectify/app-builder-contracts` is the only existing App Builder package. It is a public, Effect-schema-oriented Nx library at `packages/app-builder/contracts` with `RunRef`, `PlanRef`, `PassivePlan`, `PassiveStep`, pinned inputs, callback/continuation records, provenance, diagnostics, outcomes, and versioned references. These are passive records: there is no lifecycle state, transition authority, approval decision, cancellation protocol, persistence, lock, executor, or CLI package today.

The parent tracker assigns this grandchild the first executable boundary in `contracts → lifecycle → store/recovery → lock/executor → CLI`. Its state vocabulary is `Draft → Validated → AwaitingApproval → Ready → Executing → Succeeded | Failed | Cancelled | RecoveryRequired`. The repository uses package-local `src/index.ts`, explicit Nx build/typecheck/test/lint targets, Vitest, `@effect/vitest`, and public-surface/type tests. Current Effect v4 `main` confirms `Schema.TaggedUnion` with exhaustive `.match`, `Schema.TaggedErrorClass`, internal `Data.TaggedEnum`, `Context.Service`, `Effect.fn`, `Layer.effect`, and `Layer.effectContext` test services. Effect interruption is a cause, not a typed error, so the lifecycle must not pretend interruption can be represented by an ordinary error channel.

## Affected Areas

- `packages/app-builder/contracts/src/{reference,passive-record,outcome,diagnostic}.ts` — read-only source contracts consumed by lifecycle inputs and evidence.
- `packages/app-builder/execution/` — smallest credible new public package boundary; no package exists yet.
- `packages/app-builder/execution/src/lifecycle.ts` — schema-backed public state, transition input, transition result, and pure transition authority.
- `packages/app-builder/execution/src/transition-evidence.ts` — immutable revisioned evidence and approval provenance schemas.
- `packages/app-builder/execution/src/automatic-policy.ts` — policy request/decision service contract and deterministic test Layer only; no policy rules.
- `packages/app-builder/execution/src/failure.ts` — `Schema.TaggedErrorClass` failures for invalid state, revision conflict, unsupported transition, unknown policy, and policy evaluation failure.
- `packages/app-builder/execution/src/index.ts` — intentional package exports; contracts remain imported rather than re-exported or redefined.
- `packages/app-builder/execution/tests/` — transition tables, property/law tests, service-layer tests, interruption/cancellation boundary proofs, and public type/surface tests.

## Lifecycle Model

### State Ownership

Use a schema-backed tagged union for boundary-crossing snapshots and evidence. Each state carries the shared immutable run identity, plan, monotonic revision, and accumulated evidence; state-specific fields stay in their variant. Internal decision helpers may use `Data.TaggedEnum`, but the public lifecycle must remain serializable for the next grandchild.

Legal state changes should be closed and exhaustive:

| From                                                 | Input                                      | To                 | Automatic eligibility                                                                                    |
| ---------------------------------------------------- | ------------------------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------- |
| `Draft`                                              | validated run facts                        | `Validated`        | No policy; pure validation completion                                                                    |
| `Validated`                                          | approval required                          | `AwaitingApproval` | Safe bookkeeping only                                                                                    |
| `AwaitingApproval`                                   | approved policy decision                   | `Ready`            | Only when the requested transition is declared idempotent and the exact policy identity/version approves |
| `Ready`                                              | execution accepted                         | `Executing`        | Never auto-execute in this grandchild                                                                    |
| `Executing`                                          | successful completion                      | `Succeeded`        | No                                                                                                       |
| `Executing`                                          | typed execution failure                    | `Failed`           | No                                                                                                       |
| `Draft` / `Validated` / `AwaitingApproval` / `Ready` | cancellation confirmed                     | `Cancelled`        | Explicit request only                                                                                    |
| `Executing`                                          | executor confirms cancellation and cleanup | `Cancelled`        | No; confirmation comes from the later executor                                                           |
| `Executing`                                          | interruption leaves completion ambiguous   | `RecoveryRequired` | No                                                                                                       |

Terminal states have no outgoing transitions. All absent matrix entries fail with a typed illegal-transition error. A denied policy decision, a non-idempotent automatic request, or required human approval does **not** silently mutate to `Failed`; it returns an explicit input-required outcome with immutable decision evidence where applicable.

### Inputs, Outputs, and Evidence

- Transition requests include expected revision, exact transition tag, caller-supplied deterministic facts, and any required contract records (`RunRef`, `PassivePlan`, provenance). The core performs no I/O and reads no clock or globals.
- The pure core returns either an immutable next snapshot plus appended evidence, or a typed failure. Effect orchestration may additionally return an input-required/policy-denied result as a value rather than misclassifying it as a defect.
- Evidence includes from/to state, transition tag, previous/next revision, idempotency declaration, normalized non-secret facts, and optional policy receipt. Evidence is append-only by value; the core copies readonly arrays and never mutates an input snapshot.
- A policy receipt records exact `{ id, version }`, decision, evaluated non-secret facts, and redacted secret descriptors containing only presence/source classification—never secret values or hashes.
- Policy requests are schemas. `AutomaticPolicy.Service.evaluate(request)` is a named `Effect.fn` service operation. This child defines its contract, unknown-version failure, and test Layer; concrete policy evaluation rules remain unimplemented.
- Approval request values are first-class outputs carrying the transition being requested, required policy identity, redacted evidence, and reason. Prompting or user interaction is not part of this package.

### Pure Core vs Effect Service

Keep one pure total `transition(snapshot, input)` function as the sole legal-transition authority. A thin `RunLifecycle.Service` uses `Effect.fn` to call `AutomaticPolicy` when automatic progression is requested, translates policy outcomes into pure transition inputs, and exposes deterministic dependency injection. The service must not own mutable state; callers pass a snapshot and receive a new snapshot/result. This prevents the future store from becoming a second state machine.

### Cancellation and Interruption

Cancellation intent and runtime interruption are different facts. Before execution, explicit cancellation may transition directly to `Cancelled`. During `Executing`, a cancellation request returns an executor-facing request and leaves the snapshot unchanged; only the later executor may report either confirmed cancellation (`Executing → Cancelled`) or ambiguous interruption (`Executing → RecoveryRequired`).

The Effect service must preserve fiber interruption. It may use `Effect.onInterrupt` only to surface an injected, deterministic interruption observation/request seam, then remain interrupted; it must not catch interruption as `TransitionFailure`, convert it to success, write state, release locks, or signal processes. Those side effects belong to later grandchildren. Tests should inspect `Exit`/`Cause` and prove interruption is preserved.

## Approaches

1. **Schema snapshot plus pure reducer and thin Effect services** — Public serializable tagged states/evidence, one total transition function, and stateless `RunLifecycle`/`AutomaticPolicy` services.
   - Pros: one transition authority; deterministic; persistence-ready without persistence coupling; exhaustive matching; simple property testing; interruption remains truthful.
   - Cons: slightly more explicit request/result types; callers must carry snapshots.
   - Effort: Medium

2. **Stateful Effect service with internal `Ref`** — A service owns current state and exposes imperative transition methods.
   - Pros: superficially convenient call sites.
   - Cons: duplicates future store authority, complicates revision conflicts and recovery, hides state mutation, makes tests/order dependence harder, and invites global/runtime coupling.
   - Effort: Medium initially, High across later grandchildren.

## Recommendation

Choose the schema snapshot + pure reducer approach. Narrow the parent's tentative `creation-intent.ts` ownership: this grandchild should consume already validated `RunRef`/`PassivePlan` facts through an initialization request, not define CLI intent/defaulting. Keep the package to `lifecycle.ts`, `transition-evidence.ts`, `automatic-policy.ts`, `failure.ts`, and `index.ts`; package/Nx/TypeScript/Vitest metadata mirrors `@effectify/app-builder-contracts` when a later phase authorizes creation.

Strict TDD should begin with a complete transition table generated from every state × input pair, proving exactly the legal cells and typed failure for every other cell. Add property/law proofs for monotonic revision, identity/plan preservation, one evidence append per applied transition, input immutability, terminal-state closure, deterministic repeatability, and exhaustive state/input matching. Table-drive approval cases across approved, denied, input-required, non-idempotent, unknown policy version, and evaluator failure. Effect tests use `it.effect`, an immutable policy test Layer, `Exit`/`Cause` for preserved interruption, and no sleeps, filesystem, process, clock, or globals. Public type tests prove no unchecked widening and package-surface tests prevent accidental ownership drift. The configured verification command remains `pnpm nx affected --target=test`.

## Deferred Ownership

- `app-builder-run-store-recovery`: journal/snapshot formats, timestamps/digests, durable revisions, crash consistency, drafts, replay, resume authority, and all filesystem access.
- `app-builder-run-lock-executor`: write authority, locks, process identity, workspace mutation, subprocesses, signals/finalizers, retry schedules, and deciding whether an interrupted execution is cancelled or recovery-required.
- `app-builder-execution-cli`: creation intent/defaulting, Prompt/flags, approval interaction, draft UX, output routing, configuration, runtime wiring, and `NodeRuntime.runMain`.
- No grandchild in this exploration owns Nx generators, web, plugins, analytics, registry/marketplace, or broad scaffolding.

## Line Forecast

Estimated implementation change: **750–1,100 lines** including package metadata, source, strict tests, type/public-surface tests, and focused documentation. Expected authored production code is roughly 300–430 lines and tests 350–520 lines. This is below the 3,000-line review budget and does **not** require another functional split. The feature-branch-chain boundary remains useful because later grandchildren depend on this API; if the lifecycle alone trends above roughly 1,300 lines, first remove accidental persistence/executor/CLI ownership rather than splitting the state machine.

## Risks

- Parent terminology calls this child “policy” while its real authority is lifecycle plus a policy seam; concrete rule evaluation must not slip in.
- Marking `Executing` as cancelled on request would lie about subprocess/resource cleanup; confirmation must come from the executor.
- Adding timestamps, digests, journals, or mutable service state here would couple the pure model to store/recovery.
- Reusing passive contract interfaces without schema-decoding at external boundaries could weaken validation; the new package should accept trusted decoded values internally and expose schemas for its own boundary records.
- An idempotent lifecycle bookkeeping transition does not prove the corresponding tool/workspace operation idempotent; later recovery must require both proofs.

## Ready for Proposal

Yes. The proposal should preserve the five-file lifecycle package boundary, pure reducer authority, policy interface without policy implementation, truthful cancellation/interruption handshake, deterministic strict-TDD matrix, and explicit deferral of persistence, locks/execution, and CLI behavior. Do not advance automatically beyond exploration.
