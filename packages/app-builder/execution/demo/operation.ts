import { createHash, randomBytes } from "node:crypto"
import { join } from "node:path"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as EffectResult from "effect/Result"
import * as Schema from "effect/Schema"
import * as CleanupFinalization from "../src/cleanup-finalization.js"
import * as DraftStore from "../src/draft-store.js"
import * as DurableFileSystem from "../src/durable-file-system.js"
import * as ExecutableEvidence from "../src/internal/executable-evidence.js"
import * as LockRecoveryAuthority from "../src/lock-recovery-authority.js"
import * as ProcessIdentity from "../src/process-identity.js"
import * as PersistenceFormat from "../src/persistence-format.js"
import * as RunExecutor from "../src/run-executor.js"
import * as RunLifecycle from "../src/lifecycle.js"
import * as RunStore from "../src/run-store.js"
import * as ToolProcess from "../src/tool-process.js"
import * as WorkspaceLock from "../src/workspace-lock.js"
import { digest, failureReport, report as renderReport } from "./report.js"
export const GeneratedPayload = "Effectify App Builder executable vertical slice\n"
export class ExecutableApprovalRequired extends Schema.TaggedErrorClass<ExecutableApprovalRequired>()(
  "ExecutableApprovalRequired",
  {},
) {}
export class ExecutableOperationFailure extends Schema.TaggedErrorClass<ExecutableOperationFailure>()(
  "ExecutableOperationFailure",
  { stage: Schema.Literals(["preparation", "draft", "callback", "output", "cleanup", "receipt", "report"]) },
) {}
type Stage = ExecutableOperationFailure["stage"]
export interface Input {
  readonly workspace: string
  readonly approve: boolean
  readonly fileSystem: DurableFileSystem.DurableFileSystemService
  readonly failAt?: Stage
  /** Internal deterministic seam for durable preparation-commit failure coverage. */
  readonly failPreparationCommitAt?: 1 | 2 | 3
}
export interface Result {
  readonly handoff: ExecutableEvidence.Entry
  readonly preCleanup: ExecutableEvidence.Entry
  readonly evidence: ReadonlyArray<ExecutableEvidence.Entry>
  readonly outputDigest: string
}
const encoder = new TextEncoder()
const failure = (stage: Stage): ExecutableOperationFailure => new ExecutableOperationFailure({ stage })
const write = (
  fileSystem: DurableFileSystem.DurableFileSystemService,
  path: string,
  value: string,
  stage: Stage,
): Effect.Effect<void, ExecutableOperationFailure> =>
  Effect.acquireUseRelease(
    fileSystem.createExclusive(path, DurableFileSystem.PrivateFileMode).pipe(Effect.mapError(() => failure(stage))),
    (file) =>
      file.writeAll(encoder.encode(value)).pipe(
        Effect.andThen(file.sync),
        Effect.mapError(() => failure(stage)),
      ),
    (file) => file.close,
  ).pipe(Effect.mapError(() => failure(stage)))
const draft = {
  draftId: "draft:executable",
  runRef: { id: "run:executable", version: { major: 1, minor: 0, patch: 0 } },
  protocolRef: { id: "protocol:executable", version: { major: 1, minor: 0, patch: 0 } },
  passivePlan: {
    planRef: { id: "plan:executable", version: { major: 1, minor: 0, patch: 0 } },
    steps: [],
  },
}
const crypto = Crypto.make({
  randomBytes: (size) => new Uint8Array(randomBytes(size)),
  digest: (_algorithm, bytes) => Effect.sync(() => new Uint8Array(createHash("sha256").update(bytes).digest())),
})
const transition = (
  snapshot: RunLifecycle.LifecycleSnapshot,
  request: RunLifecycle.TransitionRequest,
): Effect.Effect<RunLifecycle.TransitionResult, ExecutableOperationFailure> =>
  EffectResult.match(RunLifecycle.reduce({ snapshot, request, priorResults: [] }), {
    onFailure: () => Effect.fail(failure("preparation")),
    onSuccess: Effect.succeed,
  })
const request = (input: unknown): RunLifecycle.TransitionRequest =>
  Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)(input)
const commit = (input: {
  readonly workspace: string
  readonly ownership: import("../src/ownership.js").WorkspaceOwnership
  readonly snapshot: RunLifecycle.LifecycleSnapshot
  readonly expectedTail: RunStore.ExpectedTail
  readonly request: RunLifecycle.TransitionRequest
  readonly fileSystem: DurableFileSystem.DurableFileSystemService
  readonly failPreparationCommitAt?: 1 | 2 | 3
}) =>
  Effect.gen(function* () {
    const result = yield* transition(input.snapshot, input.request)
    const journal = yield* RunStorePersistence.journal(input.snapshot, input.expectedTail, input.request, result).pipe(
      Effect.mapError(() => failure("preparation")),
    )
    const snapshot = yield* RunStorePersistence.snapshot(input.snapshot, result, journal.value.payloadDigest).pipe(
      Effect.mapError(() => failure("preparation")),
    )
    if (input.failPreparationCommitAt === result.snapshot.revision) return yield* Effect.fail(failure("preparation"))
    const receipt = yield* RunStore.commit({
      workspace: input.workspace,
      ownership: input.ownership,
      expectedTail: input.expectedTail,
      journal,
      snapshot,
    }).pipe(
      Effect.provide(RunStore.layer),
      Effect.provideService(DurableFileSystem.Service, input.fileSystem),
      Effect.provideService(Crypto.Crypto, crypto),
      Effect.mapError(() => failure("preparation")),
    )
    return {
      snapshot: result.snapshot,
      entry: { revision: receipt.revision, state: result.snapshot._tag, digest: receipt.payloadDigest },
      tail: { revision: receipt.revision, payloadDigest: receipt.payloadDigest },
    }
  })
const RunStorePersistence = {
  journal: (
    snapshot: RunLifecycle.LifecycleSnapshot,
    expectedTail: RunStore.ExpectedTail,
    transitionRequest: RunLifecycle.TransitionRequest,
    result: RunLifecycle.TransitionResult,
  ) =>
    PersistenceFormat.encodeJournal({
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
    }).pipe(Effect.provideService(Crypto.Crypto, crypto)),
  snapshot: (
    snapshot: RunLifecycle.LifecycleSnapshot,
    result: RunLifecycle.TransitionResult,
    tailDigest: PersistenceFormat.PayloadDigest,
  ) =>
    PersistenceFormat.encodeSnapshot({
      formatVersion: PersistenceFormat.CurrentFormatVersion,
      canonicalJson: "effectify-cjson/1",
      runRef: snapshot.runRef,
      tailDigest,
      lifecycleSnapshot: result.snapshot,
    }).pipe(Effect.provideService(Crypto.Crypto, crypto)),
}
const loadDraft = (workspace: string, fileSystem: DurableFileSystem.DurableFileSystemService) =>
  DraftStore.read({ workspace, draftId: draft.draftId }).pipe(
    Effect.catch(() =>
      DraftStore.persist({ workspace, draft }).pipe(
        Effect.andThen(DraftStore.read({ workspace, draftId: draft.draftId })),
      ),
    ),
    Effect.provide(DraftStore.layer),
    Effect.provideService(DurableFileSystem.Service, fileSystem),
    Effect.mapError(() => failure("draft")),
  )
const prepare = (
  input: Input,
  workspaceLock: WorkspaceLock.WorkspaceLockService,
  loaded: import("@effectify/app-builder-contracts").WizardDraft.ValidatedWizardDraft,
) =>
  workspaceLock
    .withExclusive({ workspace: input.workspace }, (ownership) =>
      Effect.gen(function* () {
        const initial = RunLifecycle.makeDraft({
          runRef: loaded.runRef,
          protocolRef: loaded.protocolRef,
          plan: loaded.passivePlan,
        })
        const validated = yield* commit({
          workspace: input.workspace,
          ownership,
          snapshot: initial,
          expectedTail: { revision: 0 },
          request: request({
            _tag: "Validate",
            requestId: "request:executable:validate",
            expectedRevision: 0,
            cause: "validate deterministic executable workflow",
            facts: [],
            secrets: [],
            contracts: initial.contracts,
          }),
          fileSystem: input.fileSystem,
          failPreparationCommitAt: input.failPreparationCommitAt,
        })
        const waiting = yield* commit({
          workspace: input.workspace,
          ownership,
          snapshot: validated.snapshot,
          expectedTail: validated.tail,
          request: request({
            _tag: "RequireApproval",
            requestId: "request:executable:approval",
            expectedRevision: 1,
            cause: "require explicit executable approval",
            facts: [],
            secrets: [],
            contracts: initial.contracts,
            policyRequest: {
              requestId: "policy:executable",
              policyRef: loaded.protocolRef,
              runRef: loaded.runRef,
              planRef: loaded.passivePlan.planRef,
              lifecycleIdempotent: true,
              facts: [],
              secrets: [],
            },
          }),
          fileSystem: input.fileSystem,
          failPreparationCommitAt: input.failPreparationCommitAt,
        })
        const ready = yield* commit({
          workspace: input.workspace,
          ownership,
          snapshot: waiting.snapshot,
          expectedTail: waiting.tail,
          request: request({
            _tag: "ResolveApproval",
            requestId: "request:executable:resolve",
            expectedRevision: 2,
            cause: "record explicit executable approval",
            facts: [],
            secrets: [],
            contracts: initial.contracts,
            receipt: {
              requestId: "policy:executable",
              policyRef: loaded.protocolRef,
              decision: { _tag: "Approved" },
              facts: [],
              secrets: [],
            },
          }),
          fileSystem: input.fileSystem,
          failPreparationCommitAt: input.failPreparationCommitAt,
        })
        if (ready.snapshot._tag !== "Ready") return yield* Effect.fail(failure("preparation"))
        if (input.failAt === "preparation") return yield* Effect.fail(failure("preparation"))
        return {
          snapshot: ready.snapshot,
          expectedTail: ready.tail,
          entries: [validated.entry, waiting.entry, ready.entry],
        }
      }),
    )
    .pipe(Effect.mapError(() => failure("preparation")))
export const run = (input: Input): Effect.Effect<Result, ExecutableApprovalRequired | ExecutableOperationFailure> => {
  if (!input.approve) return Effect.fail(new ExecutableApprovalRequired())
  const outputPath = join(input.workspace, "generated.txt")
  const workspaceLock = WorkspaceLock.make({
    fileSystem: input.fileSystem,
    processIdentity: ProcessIdentity.makeLive(),
    recoveryAuthority: {
      authorize: () => Effect.fail(new LockRecoveryAuthority.RecoveryAuthorizationDenied({ reason: "NotAuthorized" })),
    },
  })
  const workflow = Effect.gen(function* () {
    const existingOutput = yield* input.fileSystem.inspect(outputPath).pipe(Effect.mapError(() => failure("output")))
    if (existingOutput !== undefined) return yield* Effect.fail(failure("output"))
    const loaded = yield* loadDraft(input.workspace, input.fileSystem)
    const prepared = yield* prepare(input, workspaceLock, loaded)
    const observer = yield* ExecutableEvidence.make()
    const executor = RunExecutor.make({
      fileSystem: input.fileSystem,
      workspaceLock,
      runStore: {
        commit: (commitInput) =>
          RunStore.commit(commitInput).pipe(
            Effect.provide(RunStore.layer),
            Effect.provideService(DurableFileSystem.Service, input.fileSystem),
            Effect.provideService(Crypto.Crypto, crypto),
          ),
      },
      toolProcess: ToolProcess.none,
      finalization: {
        prepare: (cleanupInput) =>
          input.failAt === "cleanup"
            ? Effect.succeed({ _tag: "CleanupPreserved" as const, reason: "RemovalFailed" as const })
            : CleanupFinalization.prepare(cleanupInput).pipe(
                Effect.provideService(DurableFileSystem.Service, input.fileSystem),
                Effect.provideService(Crypto.Crypto, crypto),
              ),
        delete: (ticket) =>
          CleanupFinalization.deletePrepared(ticket).pipe(
            Effect.provideService(DurableFileSystem.Service, input.fileSystem),
          ),
      },
      crypto,
      onPreCleanup: (entries) =>
        input.failAt === "receipt"
          ? Effect.fail(new RunExecutor.FinalizationPreserved({ reason: "PreCleanupObserver" }))
          : ExecutableEvidence.publish(observer, entries),
    })
    yield* executor
      .execute(
        {
          workspace: input.workspace,
          snapshot: prepared.snapshot,
          expectedTail: prepared.expectedTail,
          identity: {
            runRef: prepared.snapshot.runRef,
            attemptId: "executable:attempt:one",
            idempotency: { _tag: "SingleAttempt" },
          },
          terminationGrace: 0,
        },
        (context) => {
          if (input.failAt === "callback") return Effect.fail(failure("callback"))
          if (input.failAt === "output") return Effect.fail(failure("output"))
          return context
            .mutate("generated.txt", (target) => write(input.fileSystem, target, GeneratedPayload, "output"))
            .pipe(Effect.as({ _tag: "Succeeded" as const }))
        },
      )
      .pipe(
        Effect.mapError(() =>
          failure(input.failAt === "cleanup" ? "cleanup" : input.failAt === "receipt" ? "receipt" : "callback"),
        ),
      )
    const executorEvidence = yield* observer.read
    const preCleanup = executorEvidence[1]
    if (executorEvidence.length !== 2 || preCleanup === undefined) return yield* Effect.fail(failure("receipt"))
    const result = {
      handoff: prepared.entries[2]!,
      preCleanup,
      evidence: [{ revision: 0, state: "Draft", digest: "local" }, ...prepared.entries, ...executorEvidence],
      outputDigest: digest(GeneratedPayload),
    }
    if (input.failAt === "report") return yield* Effect.fail(failure("report"))
    yield* write(
      input.fileSystem,
      join(input.workspace, "success-report.txt"),
      renderReport({
        preparation: prepared.entries,
        executor: executorEvidence,
        outputDigest: result.outputDigest,
        payload: GeneratedPayload,
      }),
      "report",
    )
    return result
  })
  return workflow.pipe(
    Effect.catch((error) => {
      const operationFailure = error instanceof ExecutableOperationFailure ? error : failure("preparation")
      return write(
        input.fileSystem,
        join(input.workspace, "failure-report.txt"),
        failureReport(operationFailure.stage),
        "report",
      ).pipe(
        Effect.catch(() => Effect.void),
        Effect.andThen(Effect.fail(operationFailure)),
      )
    }),
  )
}
export const report = (result: Result): string =>
  renderReport({
    preparation: result.evidence.filter((entry) => entry.revision >= 1 && entry.revision <= 3),
    executor: result.evidence.filter((entry) => entry.revision >= 4),
    outputDigest: result.outputDigest,
    payload: GeneratedPayload,
  })
