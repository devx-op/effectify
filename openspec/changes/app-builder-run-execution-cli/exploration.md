# Exploration: App Builder Run Execution CLI

> Exploration only. This artifact does not authorize proposal, specification, design, tasks, implementation, or branch repair.

## Current State

The roadmap defines this child as PE3–4: approvals, locks, recovery, and execution transitions in `packages/app-builder/execution` and `packages/app-builder/cli`, with the CLI as the primary product capability. The completed contract dependency supplies browser-neutral identities, envelopes, outcomes, declarations, passive plans, callbacks, continuations, replay material, and compatibility certification; it deliberately excludes transition legality, persistence, approval, locks, and execution (`packages/app-builder/contracts/src/passive-record.ts`, `outcome.ts`, `envelope.ts`, `replay.ts`, and `tool-declaration.ts` at `feat/app-builder-contract-replay-certification`).

No execution or App Builder CLI Nx project exists yet. `pnpm nx show projects --json` currently finds only `@effectify/app-builder-contracts` for the App Builder domain. The nearest repository CLI precedent is `packages/prisma/src/cli.ts`, which uses `effect/unstable/cli/Command`, `NodeServices.layer`, and `NodeRuntime.runMain`; its broad layer wiring is useful as an entrypoint example, not as the domain architecture to copy.

The workspace pins Effect `4.0.0-beta.102` in `pnpm-workspace.yaml`. Current v4 CLI composition is `Command.make`, `Command.withSharedFlags`, `Command.withSubcommands`, and `Command.run` / `runWith` from `effect/unstable/cli`; `Command.runWith` accepts an explicit argument array and is the testable boundary (`.effect-reference/effect/packages/effect/src/unstable/cli/Command.ts:526,689,807,1491,1558`). The canonical runtime boundary is `NodeRuntime.runMain`, which owns error reporting, exit codes, SIGINT/SIGTERM interruption, and teardown (`.effect-reference/effect/packages/platform-node/src/NodeRuntime.ts:1-53`). `NodeServices.layer` supplies child-process spawning, crypto, filesystem, path, stdio, and terminal services (`.effect-reference/effect/packages/platform-node/src/NodeServices.ts:1-48`). Context7 `/effect-ts/effect/effect_4.0.0-beta.102` confirms the same `Command.run(...).pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain)` pattern.

The dependency is complete in the current branch ancestry. `HEAD` and `origin/feat/app-builder-protocol-contracts` both resolve to merge commit `b42dafb`, and `git merge-base --is-ancestor 3d5fad29f HEAD` succeeds. The ancestry includes replay certification through merge commits #102 → #100 → #98 → #96 → #94, so the completed contracts are available and no branch repair is required.

## Affected Areas

- `packages/app-builder/execution/` — new Effect-first domain/runtime package for transition rules, approvals, run persistence, recovery, locking, and execution services.
- `packages/app-builder/cli/` — new CLI package containing only command composition, decoding/rendering, and the Node runtime boundary.
- `packages/app-builder/contracts/src/outcome.ts` — existing `Success | Failure | InputRequired` protocol consumed by execution; it should not be redefined.
- `packages/app-builder/contracts/src/passive-record.ts` — existing passive plans, callbacks, continuations, baselines, validations, and replay expectations consumed by the run engine.
- `packages/app-builder/contracts/src/reference.ts` — existing `RunRef`, `PlanRef`, `CallbackRef`, `ContinuationRef`, `TraceRef`, and `DigestRef` identities reused by persisted state.
- `packages/app-builder/contracts/src/tool-declaration.ts` — existing typed declaration metadata and explicit requirements consumed by tool dispatch; no shadow registry contract should be invented.
- `packages/hatchet/src/Hatchet.ts:644-757` — reusable repository pattern for a `Context.Service` layer with a semaphore-guarded state machine, shared concurrent acquisition, `Deferred`, child scopes, and `Effect.addFinalizer`.
- `packages/hatchet/src/HatchetConfig.ts:50-75` — reusable `Config` pattern; application code must not access `process.env` directly.
- `packages/hatchet/tests/unit/schedule.test.ts` and `run-no-wait.test.ts` — reusable deterministic `TestClock`, `Deferred`, interruption, and finalization tests.
- `.effect-reference/effect/packages/effect/src/FileSystem.ts:69-230,751-850` — injected filesystem service, including scoped temporary resources and scoped file handles.
- `.effect-reference/effect/packages/effect/src/Path.ts:84-258` — injected platform path service.
- `.effect-reference/effect/packages/effect/src/Terminal.ts:31-186` — injected interactive terminal service and typed `QuitError`.
- `.effect-reference/effect/packages/effect/src/unstable/process/ChildProcess.ts:24-176,491-675` — scoped, typed child-process abstraction supplied by `NodeServices.layer`.
- `.effect-reference/effect/packages/effect/src/Semaphore.ts:262-331` — interruption-safe `withPermit` / `withPermits`; suitable for process-local critical sections, not a substitute for a cross-process workspace lock.
- `.effect-reference/effect/packages/effect/src/internal/effect.ts:3930-3945` and `Scope.ts:251-402` — `Effect.acquireRelease`, scopes, and finalizers for lock handles, journals, subprocesses, and temporary resources.

## Approaches

1. **Apply this child as one implementation change** — create the execution engine, durable store, lock service, and CLI together.
   - Pros: one end-to-end feature branch and immediate CLI capability.
   - Cons: four independent correctness domains become one review unit; strict-TDD tests for transition laws, crash recovery, cross-process locking, signal interruption, and CLI protocol would likely exceed the 3,000-line review budget. The completed contracts precedent required multiple 895–2,020-line grandchildren even though it contained no filesystem, concurrency, or runtime behavior.
   - Effort: High; reject.

2. **Keep this child as a non-applied tracker and deliver four dependency-ordered grandchildren** — separate pure transition policy, durable recovery, locking/execution, and CLI composition.
   - Pros: preserves Effect-first design, gives each concurrency/persistence boundary an autonomous RED-GREEN-REFACTOR cycle, keeps domain rules out of command handlers, and supports the configured feature-branch chain.
   - Cons: delays the final user-facing command until the fourth slice and requires explicit integration contracts between slices.
   - Effort: High overall, Medium per grandchild; recommend.

3. **CLI-first vertical commands with persistence and locks embedded per handler** — implement `run`, `approve`, `resume`, and `cancel` separately.
   - Pros: visible commands appear early.
   - Cons: duplicates transition rules, hides filesystem effects, couples recovery to parsing, and encourages direct process access and global mutable locks. It is imperative command-handler architecture wrapped in Effect afterward.
   - Effort: Medium initially, High to correct; reject.

## Recommendation

Make `app-builder-run-execution-cli` a **non-applied tracker**. Propose (but do not create yet) these evidence-based grandchildren in a feature-branch chain:

1. **`app-builder-run-lifecycle`** — pure run-state algebra, legal transitions, approval requests/decisions, typed transition errors, idempotency rules, and projection to the existing `Outcome.InputRequired`. It must consume contract `RunRef`, `PlanRef`, callbacks, continuations, and diagnostics rather than redefine them. Keep this package free of filesystem, terminal, and Node runtime concerns.
2. **`app-builder-run-store-recovery`** — `RunStore` service, append/checkpoint persistence, optimistic revision checks, continuation validation, crash-safe resume, replay comparison, and corruption classification using injected `FileSystem` and `Path`. Scope all temporary/open resources and make recovery decisions explicit typed effects.
3. **`app-builder-run-lock-executor`** — cross-process workspace lock/lease service, ownership metadata, stale-lock recovery policy, scoped acquisition/release, tool dispatch, bounded concurrency, cancellation, and retry only for proven-idempotent operations. Use `Semaphore` only inside one runtime; filesystem lock authority must be persisted/atomic and injectable.
4. **`app-builder-execution-cli`** — typed `Command` tree and Args/Flags, config layer, JSON stdin/stdout envelope rendering, interactive approval adapter, `run/resume/approve/status/cancel` orchestration, and the sole `NodeRuntime.runMain` boundary. Handlers decode, invoke services, and render; they contain no transition or persistence rules.

This split follows the actual dependency direction: policy → durable state → exclusive execution → product adapter. Each grandchild can target roughly 1,200–2,500 authored changed lines including tests; any forecast above 3,000 must split again before apply. The tracker itself must never be applied.

### Effect-first architecture constraints

- Define execution/store/lock services with `Context.Service`; build live implementations with `Layer.effect`; expose public and non-trivial operations through named `Effect.fn("AppBuilder...")` functions. Repository guidance: `/Users/andres/.agents/skills/effect/references/SERVICES_LAYERS.md`; local precedent: `packages/hatchet/src/Hatchet.ts:273,589,644`.
- Model persisted/CLI boundary errors with `Schema.TaggedErrorClass`; use `Data.TaggedError` only for non-serialized internal failures. Instantiate errors directly; no redundant factories.
- Read runtime configuration through `Config` / `ConfigProvider` and layers. Args/Flags are explicit command inputs; secrets/default runtime settings are Config. `Argument.withFallbackConfig` exists, but application config should still be centralized (`Argument.ts:368-371`; project `CONFIG.md`).
- Acquire lock handles, open files, temporary directories, and subprocesses in `Scope` using `Effect.acquireRelease`, scoped platform methods, or owning layers. Finalizers must run on success, typed failure, defect, and interruption.
- Let `NodeRuntime.runMain` translate SIGINT/SIGTERM into fiber interruption. Domain services respond to interruption through scoped cleanup; they must not register ad-hoc `process.on` handlers.
- Use `Schedule` for bounded retry/backoff and only for idempotent operations. Recovery/resume is persisted domain behavior, not a retry loop.
- Use `FileSystem`, `Path`, `Terminal`, `Stdio`, `Console`, and `effect/unstable/process` services. Direct `node:fs`, `node:path`, `child_process`, `process.env`, `process.argv`, `process.stdin/stdout`, or `process.exit` belongs only in platform adapters when Effect has no supplied boundary; none is currently justified.
- Use deterministic test services and `Command.runWith` for CLI tests. Advance `TestClock`; coordinate fibers with `Deferred`, `Queue`, `Latch`, or `Ref`; never use real sleeps.

### Forbidden anti-patterns

- Domain rules in CLI handlers.
- Direct environment/application-process access outside the one runtime launcher.
- Untyped thrown exceptions, broad `catchAll` that erases failures, or `try/catch` around yielded Effects.
- Global mutable lock maps or treating `Semaphore` as cross-process authority.
- Hidden filesystem writes in constructors/helpers or unscoped file/lock handles.
- Retrying non-idempotent tool mutations or treating resume as generic retry.
- Reconstructing run/callback/continuation/tool identities instead of consuming `@effectify/app-builder-contracts`.
- Real sleeps, timing races, or live filesystem/process tests where injected services and `TestClock` can prove behavior.

## Risks

- **Unstable upstream surface:** CLI and process modules are under `effect/unstable/*` in beta.102. Pin imports and certify behavior with focused integration tests; do not add a shadow CLI framework.
- **Lock correctness:** process-local semaphores do not prevent concurrent CLI processes. The lock grandchild needs an explicit atomic filesystem protocol, ownership/lease metadata, stale-lock rules, and scoped release.
- **Crash consistency:** interruption can occur between mutation and checkpoint. Store/recovery specs must define atomic commit order and corruption outcomes before implementation.
- **Approval authenticity:** callback/continuation records are passive contracts, not proof of authorization. Approval validation and replay guards belong in lifecycle/store services.
- **Output-channel corruption:** human logs on stdout can break the JSON tool protocol. The CLI slice must reserve stdout for machine envelopes in JSON mode and route diagnostics deliberately.
- **Scope creep:** Nx generation, analytics/privacy, web App Builder, plugin workers, and migrations belong to later roadmap children and must remain excluded.

## Ready for Proposal

**Yes.** No genuine blocker remains. The next phase may create a proposal for the non-applied tracker and define only the four grandchild boundaries above; it must not authorize tracker apply or create the grandchildren during this exploration phase.

## Documentation References

- Effect v4 canonical source, `main` at `96ced895`: `.effect-reference/effect/`.
- Pinned APIs: `pnpm-workspace.yaml` (`effect` and `@effect/platform-node` `4.0.0-beta.102`).
- Effect CLI guide: `.effect-reference/effect/ai-docs/src/70_cli/10_basics.ts`.
- Context7: `/effect-ts/effect/effect_4.0.0-beta.102`, CLI basics and runtime; Scope migration; `Effect.retry`; `@effect/vitest` TestClock guidance.
- Project guidance: `/Users/andres/.agents/skills/effect/SKILL.md` and references `SERVICES_LAYERS.md`, `CONFIG.md`, `SCHEDULING.md`, `TESTING.md`.
- Nx evidence: `pnpm nx show projects --json` and `pnpm nx graph --print`; only `@effectify/app-builder-contracts` currently occupies this domain.
