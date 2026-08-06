import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"
import { GeneratedPayload, run } from "../demo/operation.js"
import { makeFakeDurableFileSystem } from "./durable-file-system-fake.js"

const workspace = "/workspace"

it.effect("rejects omitted approval before any durable mutation", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const result = yield* Effect.result(run({ workspace, approve: false, fileSystem: fake.fileSystem }))

    expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "ExecutableApprovalRequired" } })
    expect(yield* Ref.get(fake.operations)).toEqual([])
  }),
)

it.effect("persists r1-r3 before the exact Ready handoff and records executor-owned r4 plus terminal evidence", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const result = yield* run({ workspace, approve: true, fileSystem: fake.fileSystem })

    expect(result.handoff).toMatchObject({ revision: 3, state: "Ready" })
    expect(result.preCleanup).toMatchObject({ revision: 5, state: "Succeeded" })
    expect(result.evidence.map((entry) => `${entry.revision}:${entry.state}`)).toEqual([
      "0:Draft",
      "1:Validated",
      "2:WaitingForApproval",
      "3:Ready",
      "4:Executing",
      "5:Succeeded",
    ])
    expect(new TextDecoder().decode(fake.contents.get(`${workspace}/generated.txt`))).toBe(GeneratedPayload)
    expect(new TextDecoder().decode(fake.contents.get(`${workspace}/success-report.txt`))).toContain("r4=Executing")
    expect(
      (yield* Ref.get(fake.operations)).some((operation) =>
        operation.startsWith("removeTreeIfUnchanged:/workspace/.effectify/app-builder/v1/runs/"),
      ),
    ).toBe(true)
  }),
)

it.effect("preserves terminal evidence and reports failure when executor cleanup cannot be finalized", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const result = yield* Effect.result(
      run({ workspace, approve: true, fileSystem: fake.fileSystem, failAt: "cleanup" }),
    )

    expect(result).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "ExecutableOperationFailure", stage: "cleanup" },
    })
    expect(fake.contents.has(`${workspace}/success-report.txt`)).toBe(false)
    expect(new TextDecoder().decode(fake.contents.get(`${workspace}/failure-report.txt`))).toContain("stage=cleanup")
    expect(
      (yield* Ref.get(fake.operations)).some((operation) =>
        operation.startsWith("removeTreeIfUnchanged:/workspace/.effectify/app-builder/v1/runs/"),
      ),
    ).toBe(false)
  }),
)

it.effect("fails before cleanup when the pre-cleanup receipt observer cannot publish evidence", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const result = yield* Effect.result(
      run({ workspace, approve: true, fileSystem: fake.fileSystem, failAt: "receipt" }),
    )

    expect(result).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "ExecutableOperationFailure", stage: "receipt" },
    })
    expect(new TextDecoder().decode(fake.contents.get(`${workspace}/failure-report.txt`))).toContain("stage=receipt")
    expect(
      (yield* Ref.get(fake.operations)).some((operation) =>
        operation.startsWith("removeTreeIfUnchanged:/workspace/.effectify/app-builder/v1/runs/"),
      ),
    ).toBe(false)
  }),
)

it.effect("preserves recoverable failure evidence and never records success after callback failure", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const result = yield* Effect.result(
      run({ workspace, approve: true, fileSystem: fake.fileSystem, failAt: "callback" }),
    )

    expect(result).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "ExecutableOperationFailure", stage: "callback" },
    })
    expect(new TextDecoder().decode(fake.contents.get(`${workspace}/failure-report.txt`))).toContain("stage=callback")
    expect(yield* Ref.get(fake.operations)).not.toContain(`create:${workspace}/generated.txt`)
  }),
)

it.effect("stops before executor handoff when durable r1 persistence fails", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const result = yield* Effect.result(
      run({ workspace, approve: true, fileSystem: fake.fileSystem, failPreparationCommitAt: 1 }),
    )
    const operations = yield* Ref.get(fake.operations)

    expect(result).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "ExecutableOperationFailure", stage: "preparation" },
    })
    expect(operations.some((operation) => operation.endsWith("/journal/00000000000000000001.json"))).toBe(false)
    expect(operations).not.toContain(`create:${workspace}/generated.txt`)
    expect(operations.some((operation) => operation.startsWith("removeTreeIfUnchanged:"))).toBe(false)
    expect(fake.contents.has(`${workspace}/success-report.txt`)).toBe(false)
    expect(new TextDecoder().decode(fake.contents.get(`${workspace}/failure-report.txt`))).toContain(
      "stage=preparation",
    )
  }),
)

it.effect("preserves durable r1 evidence and stops before executor handoff when r2 persistence fails", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const result = yield* Effect.result(
      run({ workspace, approve: true, fileSystem: fake.fileSystem, failPreparationCommitAt: 2 }),
    )
    const operations = yield* Ref.get(fake.operations)

    expect(result).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "ExecutableOperationFailure", stage: "preparation" },
    })
    expect(operations.some((operation) => operation.endsWith("/journal/00000000000000000001.json"))).toBe(true)
    expect(operations.some((operation) => operation.endsWith("/journal/00000000000000000002.json"))).toBe(false)
    expect(operations).not.toContain(`create:${workspace}/generated.txt`)
    expect(operations.some((operation) => operation.startsWith("removeTreeIfUnchanged:"))).toBe(false)
    expect(fake.contents.has(`${workspace}/success-report.txt`)).toBe(false)
    expect(new TextDecoder().decode(fake.contents.get(`${workspace}/failure-report.txt`))).toContain(
      "stage=preparation",
    )
  }),
)

it.effect(
  "preserves durable r1-r2 evidence and stops before a fabricated Ready handoff when r3 persistence fails",
  () =>
    Effect.gen(function* () {
      const fake = yield* makeFakeDurableFileSystem()
      const result = yield* Effect.result(
        run({ workspace, approve: true, fileSystem: fake.fileSystem, failPreparationCommitAt: 3 }),
      )
      const operations = yield* Ref.get(fake.operations)

      expect(result).toMatchObject({
        _tag: "Failure",
        failure: { _tag: "ExecutableOperationFailure", stage: "preparation" },
      })
      expect(operations.some((operation) => operation.endsWith("/journal/00000000000000000001.json"))).toBe(true)
      expect(operations.some((operation) => operation.endsWith("/journal/00000000000000000002.json"))).toBe(true)
      expect(operations.some((operation) => operation.endsWith("/journal/00000000000000000003.json"))).toBe(false)
      expect(operations).not.toContain(`create:${workspace}/generated.txt`)
      expect(operations.some((operation) => operation.startsWith("removeTreeIfUnchanged:"))).toBe(false)
      expect(fake.contents.has(`${workspace}/success-report.txt`)).toBe(false)
      expect(new TextDecoder().decode(fake.contents.get(`${workspace}/failure-report.txt`))).toContain(
        "stage=preparation",
      )
    }),
)
