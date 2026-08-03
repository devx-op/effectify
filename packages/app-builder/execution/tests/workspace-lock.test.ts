import { expect, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Ref from "effect/Ref"
import * as DurableFileSystem from "../src/durable-file-system.js"
import * as LockRecoveryAuthority from "../src/lock-recovery-authority.js"
import * as ProcessIdentity from "../src/process-identity.js"
import * as WorkspaceLock from "../src/workspace-lock.js"
import { makeFakeDurableFileSystem } from "./durable-file-system-fake.js"

const workspace = "/workspace"
const lockPath = `${workspace}/.effectify/app-builder/v1/workspace.lock`
const owner = {
  hostId: "host:local",
  bootId: "boot:one",
  pid: 42,
  processStart: "start:one",
  nonce: "nonce:one",
}

const metadata = {
  format: "effectify-workspace-lock/1" as const,
  workspaceDigest: WorkspaceLock.workspaceDigest(workspace),
  ...owner,
}

const makeLock = (input: {
  readonly fileSystem: DurableFileSystem.DurableFileSystemService
  readonly status?: ProcessIdentity.OwnerStatus
  readonly authorize?: boolean
}) =>
  WorkspaceLock.make({
    fileSystem: input.fileSystem,
    processIdentity: {
      current: () => Effect.succeed(owner),
      inspect: () => Effect.succeed(input.status ?? { _tag: "Alive" }),
    },
    recoveryAuthority: {
      authorize: () =>
        input.authorize === false
          ? Effect.fail(new LockRecoveryAuthority.RecoveryAuthorizationDenied({ reason: "NotAuthorized" }))
          : Effect.void,
    },
  })

const seedLock = (fileSystem: DurableFileSystem.DurableFileSystemService, ownerBytes: Uint8Array) =>
  Effect.gen(function* () {
    const directory = yield* fileSystem.createPrivateDirectory(lockPath)
    const metadataFile = yield* fileSystem.createExclusive(`${lockPath}/owner.json`, DurableFileSystem.PrivateFileMode)
    yield* metadataFile.writeAll(ownerBytes)
    yield* metadataFile.close
    yield* directory.close
  })

it.effect("allows one contender and invokes no losing callback", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const lock = makeLock({ fileSystem: fake.fileSystem })
    const callbacks = yield* Ref.make<ReadonlyArray<string>>([])
    const entered = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()
    const first = yield* lock
      .withExclusive({ workspace }, () =>
        Ref.update(callbacks, (current) => [...current, "first"]).pipe(
          Effect.andThen(Deferred.succeed(entered, undefined)),
          Effect.andThen(Deferred.await(release)),
        ),
      )
      .pipe(Effect.forkChild)

    yield* Deferred.await(entered)
    const second = yield* Effect.result(
      lock.withExclusive({ workspace }, () => Ref.update(callbacks, (current) => [...current, "second"])),
    )
    yield* Deferred.succeed(release, undefined)
    yield* Fiber.join(first)

    expect(second).toMatchObject({ _tag: "Failure", failure: { _tag: "LockHeld" } })
    expect(yield* Ref.get(callbacks)).toHaveLength(1)
  }),
)

it.effect("rolls back a newly created lock when owner metadata publication fails", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem({ crashAt: "fileSync" })
    const result = yield* Effect.result(
      makeLock({ fileSystem: fake.fileSystem }).withExclusive({ workspace }, Effect.succeed),
    )

    expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "DurableFileSystemFailure" } })
    expect(yield* fake.fileSystem.inspect(lockPath)).toBeUndefined()
  }),
)

it.effect("preserves changed owner evidence when incomplete-lock rollback is indeterminate", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem({ crashAt: "fileSync" })
    const replacement = WorkspaceLock.encodeOwnerMetadata({ ...metadata, nonce: "nonce:replacement" })
    const fileSystem: DurableFileSystem.DurableFileSystemService = {
      ...fake.fileSystem,
      createPrivateDirectory: (path) =>
        fake.fileSystem.createPrivateDirectory(path).pipe(
          Effect.map((directory) => ({
            ...directory,
            rollback: Effect.sync(() => fake.setContents(`${lockPath}/owner.json`, replacement)).pipe(Effect.as(false)),
          })),
        ),
    }
    const result = yield* Effect.result(makeLock({ fileSystem }).withExclusive({ workspace }, Effect.succeed))

    expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "DurableFileSystemFailure" } })
    expect(yield* fake.fileSystem.readFile(`${lockPath}/owner.json`)).toEqual(replacement)
  }),
)

it.effect("takes over only byte-identical dead same-host evidence with explicit recovery authority", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const previous = { ...metadata, pid: 7, processStart: "start:previous", nonce: "nonce:previous" }
    yield* seedLock(fake.fileSystem, WorkspaceLock.encodeOwnerMetadata(previous))
    const lock = makeLock({ fileSystem: fake.fileSystem, status: { _tag: "Dead" } })
    const callbacks = yield* Ref.make(0)

    yield* lock.withExclusive({ workspace, recover: true }, () => Ref.update(callbacks, (count) => count + 1))

    expect(yield* Ref.get(callbacks)).toBe(1)
    expect(yield* fake.fileSystem.inspect(lockPath)).toBeUndefined()
  }),
)

it.effect("retains ambiguous, foreign, or changed lock evidence without callback execution", () =>
  Effect.gen(function* () {
    const ownerBytes = WorkspaceLock.encodeOwnerMetadata(metadata)
    const cases: ReadonlyArray<ProcessIdentity.OwnerStatus> = [
      { _tag: "Alive" },
      { _tag: "Unknown" },
      { _tag: "ForeignHost" },
    ]

    expect(cases).toHaveLength(3)
    for (const status of cases) {
      const fake = yield* makeFakeDurableFileSystem()
      yield* seedLock(fake.fileSystem, ownerBytes)
      const callbacks = yield* Ref.make(0)
      const result = yield* Effect.result(
        makeLock({ fileSystem: fake.fileSystem, status }).withExclusive({ workspace, recover: true }, () =>
          Ref.update(callbacks, (count) => count + 1),
        ),
      )

      expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "RecoveryDenied" } })
      expect(yield* Ref.get(callbacks)).toBe(0)
      expect(yield* fake.fileSystem.inspect(lockPath)).toMatchObject({ type: "directory" })
    }

    const fake = yield* makeFakeDurableFileSystem()
    yield* seedLock(fake.fileSystem, ownerBytes)
    const changedFileSystem: DurableFileSystem.DurableFileSystemService = {
      ...fake.fileSystem,
      replacePrivateDirectoryIfMetadataUnchanged: () => Effect.succeed(false),
    }
    const callbacks = yield* Ref.make(0)
    const result = yield* Effect.result(
      makeLock({ fileSystem: changedFileSystem, status: { _tag: "Dead" } }).withExclusive(
        { workspace, recover: true },
        () => Ref.update(callbacks, (count) => count + 1),
      ),
    )

    expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "LockEvidenceChanged" } })
    expect(yield* Ref.get(callbacks)).toBe(0)
    expect(yield* fake.fileSystem.inspect(lockPath)).toMatchObject({ type: "directory" })
  }),
)

it.effect("runs final evidence deletion only after durable lock release", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const lock = makeLock({ fileSystem: fake.fileSystem })
    const afterRelease = yield* Ref.make(0)
    const result = yield* lock.withExclusiveFinalized(
      { workspace },
      () => Effect.succeed({ value: "terminal", payload: "opaque-ticket" }),
      () => Ref.update(afterRelease, (count) => count + 1).pipe(Effect.as("terminal")),
    )

    expect(result).toBe("terminal")
    expect(yield* Ref.get(afterRelease)).toBe(1)
    expect(yield* fake.fileSystem.inspect(lockPath)).toBeUndefined()
  }),
)

it.effect("skips final evidence deletion when durable lock release fails", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const lock = makeLock({
      fileSystem: { ...fake.fileSystem, removePrivateDirectoryIfMetadataUnchanged: () => Effect.succeed(false) },
    })
    const afterRelease = yield* Ref.make(0)
    const result = yield* Effect.result(
      lock.withExclusiveFinalized(
        { workspace },
        () => Effect.succeed({ value: "terminal", payload: "opaque-ticket" }),
        () => Ref.update(afterRelease, (count) => count + 1).pipe(Effect.as("terminal")),
      ),
    )

    expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "LockEvidenceChanged" } })
    expect(yield* Ref.get(afterRelease)).toBe(0)
    expect(yield* fake.fileSystem.inspect(lockPath)).toMatchObject({ type: "directory" })
  }),
)

it.effect("keeps the legacy wrapper and owner evidence digest available", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const lock = makeLock({ fileSystem: fake.fileSystem })
    const value = yield* WorkspaceLock.withExclusive({ workspace }, () => Effect.succeed("legacy-wrapper")).pipe(
      Effect.provideService(WorkspaceLock.Service, lock),
    )

    expect(value).toBe("legacy-wrapper")
    expect(WorkspaceLock.ownerMetadataDigest(WorkspaceLock.encodeOwnerMetadata(metadata))).toHaveLength(64)
  }),
)

it.effect("rejects invalid paths and unauthorized recovery before mutation", () =>
  Effect.gen(function* () {
    const invalid = yield* Effect.result(
      makeLock({ fileSystem: (yield* makeFakeDurableFileSystem()).fileSystem }).withExclusive(
        { workspace: "relative" },
        () => Effect.void,
      ),
    )
    const fake = yield* makeFakeDurableFileSystem()
    yield* seedLock(fake.fileSystem, WorkspaceLock.encodeOwnerMetadata(metadata))
    const recovery = yield* Effect.result(
      makeLock({ fileSystem: fake.fileSystem, status: { _tag: "Dead" }, authorize: false }).withExclusive(
        { workspace, recover: true },
        () => Effect.void,
      ),
    )

    expect(invalid).toMatchObject({ _tag: "Failure", failure: { _tag: "InvalidExecutionInput" } })
    expect(recovery).toMatchObject({ _tag: "Failure", failure: { _tag: "RecoveryDenied", reason: "NotAuthorized" } })
  }),
)

it.effect("rejects malformed owner evidence through the injected lock layer", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    yield* seedLock(fake.fileSystem, Uint8Array.of(0xff))
    const service = yield* WorkspaceLock.Service.pipe(
      Effect.provide(WorkspaceLock.layer),
      Effect.provideService(DurableFileSystem.Service, fake.fileSystem),
      Effect.provideService(ProcessIdentity.Service, {
        current: () => Effect.succeed(owner),
        inspect: () => Effect.succeed({ _tag: "Dead" as const }),
      }),
      Effect.provideService(LockRecoveryAuthority.Service, { authorize: () => Effect.void }),
    )
    const result = yield* Effect.result(service.withExclusive({ workspace, recover: true }, () => Effect.void))

    expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "RecoveryDenied", reason: "AmbiguousOwner" } })
  }),
)
