import { expect, it } from "@effect/vitest"
import { createHash } from "node:crypto"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as Ownership from "../src/ownership.js"
import * as PersistenceFormat from "../src/persistence-format.js"
import * as RunExecutor from "../src/run-executor.js"
import * as ToolProcess from "../src/tool-process.js"
import * as WorkspaceLock from "../src/workspace-lock.js"
import { RunLifecycle } from "../src/index.js"

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

const makeExecutor = (active: ToolProcess.ChildProcess | undefined = undefined) =>
  Effect.gen(function* () {
    const commits = yield* Ref.make<ReadonlyArray<RunLifecycle.TransitionRequest>>([])
    const cleanups = yield* Ref.make(0)
    const executor = RunExecutor.make({
      workspaceLock: {
        withExclusive: (_input, use) => use(ownership),
      },
      runStore: {
        commit: (input) =>
          Ref.update(commits, (current) => [...current, input.journal.value.request]).pipe(
            Effect.as({
              _tag: "Committed" as const,
              revision: input.journal.value.revision,
              payloadDigest: input.journal.value.payloadDigest,
              snapshot: "current" as const,
            }),
          ),
      },
      toolProcess: {
        active: () => Effect.succeed(active === undefined ? Option.none() : Option.some(active)),
      },
      cleanup: (input) =>
        Ref.update(cleanups, (count) => count + 1).pipe(
          Effect.as({ _tag: "Cleaned" as const, tail: { revision: 5, payloadDigest: input.expectedTailDigest } }),
        ),
      crypto,
    })
    return { executor, commits, cleanups }
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
    const { executor, commits, cleanups } = yield* makeExecutor()
    const result = yield* executor.execute(executeInput, () =>
      Ref.get(commits).pipe(
        Effect.tap((requests) =>
          Effect.sync(() => expect(requests.map((request) => request._tag)).toEqual(["AcceptExecution"])),
        ),
        Effect.as({ _tag: "Succeeded" as const }),
      ),
    )

    expect(result).toMatchObject({ outcome: { _tag: "Succeeded" } })
    expect((yield* Ref.get(commits)).map((request) => request._tag)).toEqual(["AcceptExecution", "Complete"])
    expect(yield* Ref.get(cleanups)).toBe(1)
  }),
)

it.effect("returns TerminationTimedOut without terminal persistence or cleanup when a child cannot settle", () =>
  Effect.gen(function* () {
    const stopRequests = yield* Ref.make(0)
    const child: ToolProcess.ChildProcess = {
      requestStop: Ref.update(stopRequests, (count) => count + 1),
      awaitExit: Effect.never,
    }
    const { executor, commits, cleanups } = yield* makeExecutor(child)
    const outcome = yield* Effect.result(executor.execute(executeInput, () => Effect.succeed({ _tag: "Succeeded" })))

    expect(outcome).toMatchObject({ _tag: "Failure", failure: { _tag: "TerminationTimedOut" } })
    expect((yield* Ref.get(commits)).map((request) => request._tag)).toEqual(["AcceptExecution"])
    expect(yield* Ref.get(cleanups)).toBe(0)
    expect(yield* Ref.get(stopRequests)).toBe(1)
  }),
)

it.effect("uses supported force termination only after the bounded graceful stop window expires", () =>
  Effect.gen(function* () {
    const forced = yield* Ref.make(false)
    const forceRequests = yield* Ref.make(0)
    const child: ToolProcess.ChildProcess = {
      requestStop: Effect.void,
      awaitExit: Ref.get(forced).pipe(
        Effect.flatMap((didForce) => (didForce ? Effect.succeed({ code: 0 }) : Effect.never)),
      ),
      forceTerminate: Ref.set(forced, true).pipe(Effect.andThen(Ref.update(forceRequests, (count) => count + 1))),
    }
    const { executor } = yield* makeExecutor(child)
    const result = yield* executor.execute(executeInput, () => Effect.succeed({ _tag: "Succeeded" }))

    expect(result).toMatchObject({ outcome: { _tag: "Succeeded" } })
    expect(yield* Ref.get(forceRequests)).toBe(1)
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
