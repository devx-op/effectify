import * as Context from "effect/Context"
import * as Crypto from "effect/Crypto"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as Cleanup from "./cleanup.js"
import * as DurableFileSystem from "./durable-file-system.js"
import * as LifecycleFailure from "./failure.js"
import * as Ownership from "./ownership.js"
import * as PersistenceFormat from "./persistence-format.js"
import * as RunLifecycle from "./lifecycle.js"
import * as RunStore from "./run-store.js"
import * as ToolProcess from "./tool-process.js"
import * as WorkspaceLock from "./workspace-lock.js"
import * as WorkspaceMutator from "./workspace-mutator.js"

export type IdempotencyProof =
  | { readonly _tag: "SingleAttempt" }
  | { readonly _tag: "ReplaySafe"; readonly key: string }

export interface CallbackIdentity {
  readonly runRef: RunLifecycle.LifecycleSnapshot["runRef"]
  readonly attemptId: string
  readonly idempotency: IdempotencyProof
}

export interface ExecutionContext {
  readonly workspace: string
  readonly ownership: Ownership.WorkspaceOwnership
  readonly mutate: <Value, Error, Requirements>(
    relativePath: string,
    operation: (target: string) => Effect.Effect<Value, Error, Requirements>,
  ) => Effect.Effect<
    Value,
    Error | WorkspaceLock.OwnershipRejected | WorkspaceMutator.WorkspaceMutationRejected,
    Requirements
  >
}

export type ExecutionOutcome = RunLifecycle.CompletionOutcome

export interface ExecuteInput {
  readonly workspace: string
  readonly snapshot: Extract<RunLifecycle.LifecycleSnapshot, { readonly _tag: "Ready" }>
  readonly expectedTail: RunStore.ExpectedTail
  readonly identity: CallbackIdentity
  readonly terminationGrace: Duration.Input
  readonly recover?: boolean
}

export interface ExecutionResult {
  readonly outcome: ExecutionOutcome
  readonly terminal: Extract<RunLifecycle.LifecycleSnapshot, { readonly _tag: "Succeeded" | "Failed" }>
}

export class InvalidExecutionInput extends Schema.TaggedErrorClass<InvalidExecutionInput>()("InvalidExecutionInput", {
  reason: Schema.Literals(["CallbackIdentity", "TerminationGrace"]),
}) {}

export class TerminationTimedOut extends Schema.TaggedErrorClass<TerminationTimedOut>()("TerminationTimedOut", {
  attemptId: Schema.String,
}) {}

export class FinalizationPreserved extends Schema.TaggedErrorClass<FinalizationPreserved>()("FinalizationPreserved", {
  reason: Schema.String,
}) {}

export type ExecutorFailure =
  | Cleanup.CleanupPreserved
  | FinalizationPreserved
  | InvalidExecutionInput
  | LifecycleFailure.LifecycleFailure
  | PersistenceFormat.PersistenceFormatFailure
  | RunStore.StoreFailure
  | TerminationTimedOut
  | ToolProcess.ToolProcessFailure
  | WorkspaceLock.WorkspaceLockFailure
  | WorkspaceMutator.WorkspaceMutationRejected

interface ClosedRunStore {
  readonly commit: (input: RunStore.CommitInput) => Effect.Effect<RunStore.CommitReceipt, RunStore.StoreFailure>
}

interface Dependencies {
  readonly workspaceLock: WorkspaceLock.WorkspaceLockService
  readonly runStore: ClosedRunStore
  readonly toolProcess: ToolProcess.ToolProcessService
  readonly cleanup: (input: Cleanup.CleanupInput) => Effect.Effect<Cleanup.CleanupOutcome>
  readonly crypto: Crypto.Crypto
}

export interface RunExecutorService {
  readonly execute: <Error, Requirements>(
    input: ExecuteInput,
    callback: (context: ExecutionContext) => Effect.Effect<ExecutionOutcome, Error, Requirements>,
  ) => Effect.Effect<ExecutionResult, Error | ExecutorFailure, Requirements>
}

export class Service extends Context.Service<Service, RunExecutorService>()(
  "@effectify/app-builder-execution/RunExecutor",
) {}

const sameReference = (left: CallbackIdentity["runRef"], right: CallbackIdentity["runRef"]): boolean =>
  left.id === right.id &&
  left.version.major === right.version.major &&
  left.version.minor === right.version.minor &&
  left.version.patch === right.version.patch

const parsedGrace = (input: Duration.Input): Duration.Duration | undefined => {
  const duration = Duration.fromInput(input)
  return Option.isSome(duration) && Duration.isFinite(duration.value) && !Duration.isNegative(duration.value)
    ? duration.value
    : undefined
}

const transition = (
  snapshot: RunLifecycle.LifecycleSnapshot,
  request: RunLifecycle.TransitionRequest,
): Effect.Effect<RunLifecycle.TransitionResult, LifecycleFailure.LifecycleFailure> =>
  Result.match(RunLifecycle.reduce({ snapshot, request, priorResults: [] }), {
    onFailure: Effect.fail,
    onSuccess: Effect.succeed,
  })

const request = (input: {
  readonly _tag: "AcceptExecution" | "Complete"
  readonly snapshot: RunLifecycle.LifecycleSnapshot
  readonly attemptId: string
  readonly outcome?: ExecutionOutcome
}): RunLifecycle.TransitionRequest =>
  Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)(
    input._tag === "AcceptExecution"
      ? {
          _tag: "AcceptExecution",
          requestId: `executor:${input.attemptId}:start`,
          expectedRevision: input.snapshot.revision,
          cause: "Start resolved execution callback",
          facts: [],
          secrets: [],
          contracts: input.snapshot.contracts,
        }
      : {
          _tag: "Complete",
          requestId: `executor:${input.attemptId}:complete`,
          expectedRevision: input.snapshot.revision,
          cause: "Persist proven resolved execution outcome",
          facts: [],
          secrets: [],
          contracts: input.snapshot.contracts,
          outcome: input.outcome,
        },
  )

const encodeCommit = (
  dependencies: Dependencies,
  input: ExecuteInput,
  ownership: Ownership.WorkspaceOwnership,
  snapshot: RunLifecycle.LifecycleSnapshot,
  expectedTail: RunStore.ExpectedTail,
  transitionRequest: RunLifecycle.TransitionRequest,
): Effect.Effect<
  { readonly receipt: RunStore.CommitReceipt; readonly result: RunLifecycle.TransitionResult },
  LifecycleFailure.LifecycleFailure | PersistenceFormat.PersistenceFormatFailure | RunStore.StoreFailure
> =>
  Effect.gen(function* () {
    const result = yield* transition(snapshot, transitionRequest)
    const journal = yield* PersistenceFormat.encodeJournal({
      formatVersion: PersistenceFormat.CurrentFormatVersion,
      canonicalJson: "effectify-cjson/1",
      runRef: snapshot.runRef,
      revision: result.snapshot.revision,
      sequence: result.evidence.sequence,
      ...(expectedTail.payloadDigest === undefined ? {} : { predecessorDigest: expectedTail.payloadDigest }),
      snapshot: result.snapshot,
      request: transitionRequest,
      result,
      priorResults: [],
      evidence: result.evidence,
    }).pipe(Effect.provideService(Crypto.Crypto, dependencies.crypto))
    const acceleration = yield* PersistenceFormat.encodeSnapshot({
      formatVersion: PersistenceFormat.CurrentFormatVersion,
      canonicalJson: "effectify-cjson/1",
      runRef: snapshot.runRef,
      tailDigest: journal.value.payloadDigest,
      lifecycleSnapshot: result.snapshot,
    }).pipe(Effect.provideService(Crypto.Crypto, dependencies.crypto))
    const receipt = yield* dependencies.runStore.commit({
      workspace: input.workspace,
      ownership,
      expectedTail,
      journal,
      snapshot: acceleration,
    })
    return { receipt, result }
  })

const settleChild = (
  process: ToolProcess.ToolProcessService,
  grace: Duration.Duration,
): Effect.Effect<boolean, ToolProcess.ToolProcessFailure> =>
  Effect.gen(function* () {
    const active = yield* process.active()
    if (Option.isNone(active)) return true
    const child = active.value
    yield* child.requestStop
    const stopped = yield* child.awaitExit.pipe(Effect.timeoutOption(grace))
    if (Option.isSome(stopped)) return true
    if (child.forceTerminate === undefined) return false
    yield* child.forceTerminate
    return Option.isSome(yield* child.awaitExit.pipe(Effect.timeoutOption(grace)))
  })

/** Builds a closed executor from explicit lock, store, process, cleanup, and crypto dependencies. */
export const make = (dependencies: Dependencies): RunExecutorService => ({
  execute: (input, callback) => {
    const grace = parsedGrace(input.terminationGrace)
    if (grace === undefined) return Effect.fail(new InvalidExecutionInput({ reason: "TerminationGrace" }))
    if (!sameReference(input.snapshot.runRef, input.identity.runRef) || input.identity.attemptId.length === 0) {
      return Effect.fail(new InvalidExecutionInput({ reason: "CallbackIdentity" }))
    }
    return dependencies.workspaceLock.withExclusive(
      { workspace: input.workspace, recover: input.recover },
      (ownership) =>
        Effect.uninterruptibleMask((restore) =>
          Effect.gen(function* () {
            const start = yield* encodeCommit(
              dependencies,
              input,
              ownership,
              input.snapshot,
              input.expectedTail,
              request({ _tag: "AcceptExecution", snapshot: input.snapshot, attemptId: input.identity.attemptId }),
            )
            const context: ExecutionContext = {
              workspace: input.workspace,
              ownership,
              mutate: (relativePath, operation) =>
                WorkspaceMutator.mutate({ workspace: input.workspace, ownership, relativePath }, operation),
            }
            const callbackExit = yield* restore(callback(context)).pipe(Effect.exit)
            const settled = yield* settleChild(dependencies.toolProcess, grace)
            if (!settled) return yield* Effect.fail(new TerminationTimedOut({ attemptId: input.identity.attemptId }))
            if (Exit.isFailure(callbackExit)) return yield* Effect.failCause(callbackExit.cause)
            const outcome = callbackExit.value
            const terminal = yield* encodeCommit(
              dependencies,
              input,
              ownership,
              start.result.snapshot,
              { revision: start.receipt.revision, payloadDigest: start.receipt.payloadDigest },
              request({
                _tag: "Complete",
                snapshot: start.result.snapshot,
                attemptId: input.identity.attemptId,
                outcome,
              }),
            )
            const cleanup = yield* dependencies.cleanup({
              workspace: input.workspace,
              ownership,
              runRef: input.snapshot.runRef,
              expectedTailDigest: terminal.receipt.payloadDigest,
            })
            if (cleanup._tag !== "Cleaned")
              return yield* Effect.fail(new FinalizationPreserved({ reason: cleanup.reason }))
            if (terminal.result.snapshot._tag !== "Succeeded" && terminal.result.snapshot._tag !== "Failed") {
              return yield* Effect.fail(new FinalizationPreserved({ reason: "UnexpectedTerminal" }))
            }
            return { outcome, terminal: terminal.result.snapshot }
          }),
        ),
    )
  },
})

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const workspaceLock = yield* WorkspaceLock.Service
    const runStore = yield* RunStore.Service
    const toolProcess = yield* ToolProcess.Service
    const fileSystem = yield* DurableFileSystem.Service
    const crypto = yield* Crypto.Crypto
    return Service.of(
      make({
        workspaceLock,
        runStore: {
          commit: (input) =>
            runStore
              .commit(input)
              .pipe(
                Effect.provideService(DurableFileSystem.Service, fileSystem),
                Effect.provideService(Crypto.Crypto, crypto),
              ),
        },
        toolProcess,
        cleanup: (input) =>
          Cleanup.cleanup(input).pipe(
            Effect.provideService(DurableFileSystem.Service, fileSystem),
            Effect.provideService(Crypto.Crypto, crypto),
          ),
        crypto,
      }),
    )
  }),
)

export const execute = <Error, Requirements>(
  input: ExecuteInput,
  callback: (context: ExecutionContext) => Effect.Effect<ExecutionOutcome, Error, Requirements>,
): Effect.Effect<ExecutionResult, Error | ExecutorFailure, Service | Requirements> =>
  Effect.flatMap(Service, (service) => service.execute(input, callback))
