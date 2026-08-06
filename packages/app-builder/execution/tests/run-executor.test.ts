import { expect, it } from "@effect/vitest"
import { createHash } from "node:crypto"
import * as Cause from "effect/Cause"
import * as Crypto from "effect/Crypto"
import * as DurableFileSystem from "../src/durable-file-system.js"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as Ownership from "../src/ownership.js"
import * as PersistenceFormat from "../src/persistence-format.js"
import * as RunExecutor from "../src/run-executor.js"
import * as RunStore from "../src/run-store.js"
import * as ToolProcess from "../src/tool-process.js"
import * as WorkspaceLock from "../src/workspace-lock.js"
import { RunLifecycle } from "../src/index.js"
import { makeFakeDurableFileSystem } from "./durable-file-system-fake.js"

const version = { major: 1, minor: 0, patch: 0 }
const runRef = { id: "run:executor", version }
const contracts = {
  planRef: { id: "plan:executor", version },
  protocolRef: { id: "protocol:executor", version },
}
const workspace = "/workspace"
const ownership = Ownership.issueForScope({
  workspace,
  lockPath: WorkspaceLock.workspaceLockPath(workspace),
})
const crypto = Crypto.make({
  randomBytes: (size) => new Uint8Array(size),
  digest: (_algorithm, bytes) => Effect.sync(() => new Uint8Array(createHash("sha256").update(bytes).digest())),
})
const success = <Value>(result: Result.Result<Value, unknown>): Value =>
  Result.match(result, {
    onFailure: (failure) => {
      throw failure
    },
    onSuccess: (value) => value,
  })
const initial = Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({
  _tag: "Draft",
  runRef,
  contracts,
  revision: 0,
  lastSequence: 0,
  history: [],
})
const validate = Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
  _tag: "Validate",
  requestId: "request:executor:validate",
  expectedRevision: 0,
  cause: "prepare a complete ready snapshot",
  facts: [],
  secrets: [],
  contracts,
})
const validated = success(RunLifecycle.reduce({ snapshot: initial, request: validate, priorResults: [] }))
const policyRequest = {
  requestId: "policy:executor",
  policyRef: contracts.protocolRef,
  runRef,
  planRef: contracts.planRef,
  lifecycleIdempotent: true,
  facts: [],
  secrets: [],
}
const requireApproval = Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
  _tag: "RequireApproval",
  requestId: "request:executor:approval",
  expectedRevision: 1,
  cause: "require a deterministic approval",
  facts: [],
  secrets: [],
  contracts,
  policyRequest,
})
const waiting = success(
  RunLifecycle.reduce({ snapshot: validated.snapshot, request: requireApproval, priorResults: [] }),
)
const receipt = {
  requestId: "policy:executor",
  policyRef: contracts.protocolRef,
  decision: { _tag: "Approved" as const },
  facts: [],
  secrets: [],
}
const resolveApproval = Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
  _tag: "ResolveApproval",
  requestId: "request:executor:resolve",
  expectedRevision: 2,
  cause: "accept deterministic approval",
  facts: [],
  secrets: [],
  contracts,
  receipt,
})
const resolvedReady = success(
  RunLifecycle.reduce({ snapshot: waiting.snapshot, request: resolveApproval, priorResults: [] }),
).snapshot
if (resolvedReady._tag !== "Ready") throw new Error("Expected a Ready snapshot")
const ready = resolvedReady

const makeExecutor = (
  options: {
    readonly active?: () => Effect.Effect<Option.Option<ToolProcess.ChildProcess>, ToolProcess.ToolProcessFailure>
    readonly commitFailure?: RunLifecycle.TransitionRequest["_tag"]
    readonly observed?: Ref.Ref<ReadonlyArray<number>>
  } = {},
) =>
  Effect.gen(function* () {
    const fileSystem = (yield* makeFakeDurableFileSystem()).fileSystem
    const commits = yield* Ref.make<ReadonlyArray<RunLifecycle.TransitionRequest>>([])
    const finalizations = yield* Ref.make(0)
    const observed = options.observed
    const workspaceLock: WorkspaceLock.WorkspaceLockService = {
      withExclusive: (_input, use) => use(ownership),
      withExclusiveFinalized: (_input, use, afterRelease) =>
        use(ownership).pipe(Effect.flatMap(({ value, payload }) => afterRelease(payload).pipe(Effect.as(value)))),
    }
    const executor = RunExecutor.make({
      fileSystem,
      workspaceLock,
      runStore: {
        commit: (commitInput) =>
          Ref.update(commits, (current) => [...current, commitInput.journal.value.request]).pipe(
            Effect.andThen(
              options.commitFailure === commitInput.journal.value.request._tag
                ? Effect.fail(new RunStore.TailConflict({ expectedRevision: 0, actualRevision: 1 }))
                : Effect.succeed({
                    _tag: "Committed" as const,
                    revision: commitInput.journal.value.revision,
                    payloadDigest: commitInput.journal.value.payloadDigest,
                    snapshot: "current" as const,
                  }),
            ),
          ),
      },
      toolProcess: {
        active: options.active ?? (() => Effect.succeed(Option.none())),
      },
      finalization: {
        prepare: () => Effect.succeed({ _tag: "CleanupFinalizationTicket" as const }),
        delete: () =>
          Ref.update(finalizations, (count) => count + 1).pipe(
            Effect.as({ _tag: "Cleaned" as const, tail: { revision: 5, payloadDigest: "a".repeat(64) } }),
          ),
      },
      crypto,
      ...(observed === undefined
        ? {}
        : {
            onPreCleanup: (entries: ReadonlyArray<{ readonly revision: number }>) =>
              Ref.set(
                observed,
                entries.map((entry) => entry.revision),
              ),
          }),
    })
    return { executor, commits, finalizations, workspaceLock }
  })

const child = (input: Partial<ToolProcess.ChildProcess> = {}): ToolProcess.ChildProcess => ({
  requestStop: Effect.void,
  awaitExit: Effect.succeed({ code: 0 }),
  ...input,
})

const executeInput = {
  workspace,
  snapshot: ready,
  expectedTail: { revision: 3, payloadDigest: PersistenceFormat.PayloadDigest.make("a".repeat(64)) },
  identity: { runRef: ready.runRef, attemptId: "attempt:one", idempotency: { _tag: "SingleAttempt" as const } },
  terminationGrace: 0,
}

it.effect("commits Executing before invoking the resolved callback and records one proven terminal outcome", () =>
  Effect.gen(function* () {
    const { executor, commits, finalizations } = yield* makeExecutor()
    const result = yield* RunExecutor.execute(executeInput, (context) =>
      context
        .mutate("proof", (target) => Effect.sync(() => expect(target).toBe("/workspace/proof")))
        .pipe(
          Effect.andThen(
            Ref.get(commits).pipe(
              Effect.tap((requests) =>
                Effect.sync(() => expect(requests.map((request) => request._tag)).toEqual(["AcceptExecution"])),
              ),
              Effect.as({ _tag: "Succeeded" as const }),
            ),
          ),
        ),
    ).pipe(Effect.provideService(RunExecutor.Service, executor))

    expect(result).toMatchObject({ outcome: { _tag: "Succeeded" } })
    expect((yield* Ref.get(commits)).map((request) => request._tag)).toEqual(["AcceptExecution", "Complete"])
    expect(yield* Ref.get(finalizations)).toBe(1)
  }),
)

it.effect("publishes executor-owned execution and terminal evidence before cleanup", () =>
  Effect.gen(function* () {
    const observed = yield* Ref.make<ReadonlyArray<number>>([])
    const { executor } = yield* makeExecutor({ observed })
    yield* executor.execute(executeInput, () => Effect.succeed({ _tag: "Succeeded" }))

    expect(yield* Ref.get(observed)).toEqual([4, 5])
  }),
)

it.effect("returns TerminationTimedOut without terminal persistence or cleanup when a child cannot settle", () =>
  Effect.gen(function* () {
    const stopRequests = yield* Ref.make(0)
    const activeChild: ToolProcess.ChildProcess = {
      requestStop: Ref.update(stopRequests, (count) => count + 1),
      awaitExit: Effect.never,
    }
    const { executor, commits, finalizations } = yield* makeExecutor({
      active: () => Effect.succeed(Option.some(activeChild)),
    })
    const outcome = yield* Effect.result(executor.execute(executeInput, () => Effect.succeed({ _tag: "Succeeded" })))

    expect(outcome).toMatchObject({ _tag: "Failure", failure: { _tag: "TerminationTimedOut" } })
    expect((yield* Ref.get(commits)).map((request) => request._tag)).toEqual(["AcceptExecution"])
    expect(yield* Ref.get(finalizations)).toBe(0)
    expect(yield* Ref.get(stopRequests)).toBe(1)
  }),
)

it.effect("uses supported force termination only after the bounded graceful stop window expires", () =>
  Effect.gen(function* () {
    const forced = yield* Ref.make(false)
    const forceRequests = yield* Ref.make(0)
    const activeChild: ToolProcess.ChildProcess = {
      requestStop: Effect.void,
      awaitExit: Ref.get(forced).pipe(
        Effect.flatMap((didForce) => (didForce ? Effect.succeed({ code: 0 }) : Effect.never)),
      ),
      forceTerminate: Ref.set(forced, true).pipe(Effect.andThen(Ref.update(forceRequests, (count) => count + 1))),
    }
    const { executor } = yield* makeExecutor({ active: () => Effect.succeed(Option.some(activeChild)) })
    const result = yield* executor.execute(executeInput, () => Effect.succeed({ _tag: "Succeeded" }))

    expect(result).toMatchObject({ outcome: { _tag: "Succeeded" } })
    expect(yield* Ref.get(forceRequests)).toBe(1)
  }),
)

it.effect("persists cancellation only for interruption-only callbacks after child settlement", () =>
  Effect.gen(function* () {
    const { executor, commits, finalizations } = yield* makeExecutor({
      active: () => Effect.succeed(Option.some(child())),
    })
    const result = yield* executor.execute(executeInput, () => Effect.interrupt)

    expect(result).toMatchObject({ _tag: "Cancelled", terminal: { _tag: "Cancelled" } })
    expect((yield* Ref.get(commits)).map((request) => request._tag)).toEqual([
      "AcceptExecution",
      "RequestCancellation",
      "ConfirmCancellation",
    ])
    expect(yield* Ref.get(finalizations)).toBe(1)
  }),
)

it.effect("retains non-cancelled evidence for mixed causes, adapter failures, and partial cancellation commits", () =>
  Effect.gen(function* () {
    const mixed = yield* makeExecutor()
    const mixedResult = yield* Effect.exit(
      mixed.executor.execute(executeInput, () =>
        Effect.failCause(Cause.fromReasons([Cause.makeInterruptReason(), Cause.makeFailReason("mixed")])),
      ),
    )
    const adapter = yield* makeExecutor({
      active: () => Effect.fail(new ToolProcess.ToolProcessFailure({ operation: "wait" })),
    })
    const adapterResult = yield* Effect.result(
      adapter.executor.execute(executeInput, () => Effect.succeed({ _tag: "Succeeded" })),
    )
    const partial = yield* makeExecutor({ commitFailure: "ConfirmCancellation" })
    const partialResult = yield* Effect.result(partial.executor.execute(executeInput, () => Effect.interrupt))

    expect(Exit.isFailure(mixedResult)).toBe(true)
    if (Exit.isFailure(mixedResult)) expect(Cause.hasInterruptsOnly(mixedResult.cause)).toBe(false)
    expect((yield* Ref.get(mixed.commits)).map((request) => request._tag)).toEqual(["AcceptExecution"])
    expect(adapterResult).toMatchObject({ _tag: "Failure", failure: { _tag: "ToolProcessFailure" } })
    expect((yield* Ref.get(adapter.commits)).map((request) => request._tag)).toEqual(["AcceptExecution"])
    expect(partialResult).toMatchObject({ _tag: "Failure", failure: { _tag: "TailConflict" } })
    expect((yield* Ref.get(partial.commits)).map((request) => request._tag)).toEqual([
      "AcceptExecution",
      "RequestCancellation",
      "ConfirmCancellation",
    ])
    expect(yield* Ref.get(partial.finalizations)).toBe(0)
  }),
)

it.effect("rejects invalid inputs and builds the dependency-injected executor layer", () =>
  Effect.gen(function* () {
    const { executor, workspaceLock } = yield* makeExecutor()
    const grace = yield* Effect.result(
      executor.execute({ ...executeInput, terminationGrace: Duration.infinity }, () =>
        Effect.succeed({ _tag: "Succeeded" }),
      ),
    )
    const identity = yield* Effect.result(
      executor.execute({ ...executeInput, identity: { ...executeInput.identity, attemptId: "" } }, () =>
        Effect.succeed({ _tag: "Succeeded" }),
      ),
    )
    const fake = yield* makeFakeDurableFileSystem()
    const service = yield* RunExecutor.Service.pipe(
      Effect.provide(RunExecutor.layer),
      Effect.provideService(WorkspaceLock.Service, workspaceLock),
      Effect.provideService(RunStore.Service, {
        commit: () => Effect.fail(new RunStore.TailConflict({ expectedRevision: 0, actualRevision: 1 })),
      }),
      Effect.provideService(ToolProcess.Service, ToolProcess.none),
      Effect.provideService(DurableFileSystem.Service, fake.fileSystem),
      Effect.provideService(Crypto.Crypto, crypto),
    )

    expect(grace).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "InvalidExecutionInput", reason: "TerminationGrace" },
    })
    expect(identity).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "InvalidExecutionInput", reason: "CallbackIdentity" },
    })
    expect(typeof service.execute).toBe("function")
    expect(
      yield* Effect.result(service.execute(executeInput, () => Effect.succeed({ _tag: "Succeeded" }))),
    ).toMatchObject({ _tag: "Failure" })
  }),
)

it("accepts argv-only commands and rejects shell-like workspace escapes or unsafe environment data", () => {
  expect(
    ToolProcess.validateSpawn({ workspace, argv: ["tool", "--safe"], cwd: workspace, environment: { TOKEN: "value" } }),
  ).toEqual({ _tag: "Valid" })
  expect(
    ToolProcess.validateSpawn({
      workspace,
      argv: ["sh", "-c", "echo unsafe"],
      cwd: "/tmp",
      environment: { TOKEN: "bad\u0000value" },
    }),
  ).toMatchObject({ _tag: "Invalid", reason: "UnsafeCwd" })
})
