import { createHash } from "node:crypto"
import { dirname, isAbsolute, join, resolve } from "node:path"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as DurableFileSystem from "./durable-file-system.js"
import * as LockRecoveryAuthority from "./lock-recovery-authority.js"
import * as Ownership from "./ownership.js"
import * as ProcessIdentity from "./process-identity.js"
import * as ManagedPath from "./managed-path.js"

const lockFormat = "effectify-workspace-lock/1" as const
const ownerFile = "owner.json"

export const OwnerMetadata = Schema.Struct({
  format: Schema.Literals([lockFormat]),
  workspaceDigest: Schema.String,
  hostId: Schema.String,
  bootId: Schema.String,
  pid: Schema.Number,
  processStart: Schema.String,
  nonce: Schema.String,
})
export type OwnerMetadata = typeof OwnerMetadata.Type

export class LockHeld extends Schema.TaggedErrorClass<LockHeld>()("LockHeld", { workspace: Schema.String }) {}

export class RecoveryDenied extends Schema.TaggedErrorClass<RecoveryDenied>()("RecoveryDenied", {
  reason: Schema.Literals(["AmbiguousOwner", "MissingOwnerEvidence", "NotAuthorized", "OwnerNotDead"]),
}) {}

export class LockEvidenceChanged extends Schema.TaggedErrorClass<LockEvidenceChanged>()("LockEvidenceChanged", {
  workspace: Schema.String,
}) {}

export class InvalidExecutionInput extends Schema.TaggedErrorClass<InvalidExecutionInput>()("InvalidExecutionInput", {
  reason: Schema.Literals(["WorkspacePath"]),
}) {}

export class OwnershipRejected extends Schema.TaggedErrorClass<OwnershipRejected>()("OwnershipRejected", {
  reason: Schema.Literals(["Inactive", "WrongScope"]),
}) {}

export type WorkspaceLockFailure =
  | DurableFileSystem.DurableFailure
  | InvalidExecutionInput
  | LockEvidenceChanged
  | LockHeld
  | OwnershipRejected
  | RecoveryDenied

export interface WithExclusiveInput {
  readonly workspace: string
  /** Request recovery only when a concrete LockRecoveryAuthority service was supplied. */
  readonly recover?: boolean
}

export interface WorkspaceLockService {
  readonly withExclusive: <Value, Error, Requirements>(
    input: WithExclusiveInput,
    use: (ownership: Ownership.WorkspaceOwnership) => Effect.Effect<Value, Error, Requirements>,
  ) => Effect.Effect<Value, Error | WorkspaceLockFailure, Requirements>
  readonly withExclusiveFinalized: <Value, Payload, Error, Requirements>(
    input: WithExclusiveInput,
    use: (
      ownership: Ownership.WorkspaceOwnership,
    ) => Effect.Effect<{ readonly value: Value; readonly payload: Payload }, Error, Requirements>,
    afterRelease: (payload: Payload) => Effect.Effect<Value, Error, Requirements>,
  ) => Effect.Effect<Value, Error | WorkspaceLockFailure, Requirements>
}

export class Service extends Context.Service<Service, WorkspaceLockService>()(
  "@effectify/app-builder-execution/WorkspaceLock",
) {}

interface LockLease {
  readonly ownership: Ownership.WorkspaceOwnership
  readonly workspace: string
  readonly lockPath: string
  readonly metadataPath: string
  readonly metadata: Uint8Array
}

export interface Dependencies {
  readonly fileSystem: DurableFileSystem.DurableFileSystemService
  readonly processIdentity: ProcessIdentity.ProcessIdentityService
  readonly recoveryAuthority: LockRecoveryAuthority.LockRecoveryAuthorityService
}

const toHex = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

export const workspaceDigest = (workspace: string): string =>
  createHash("sha256").update(resolve(workspace), "utf8").digest("hex")

export const workspaceLockPath = (workspace: string): string =>
  join(resolve(workspace), ".effectify", "app-builder", "v1", "workspace.lock")

/** Canonical field order makes byte equality a direct owner-evidence comparison. */
export const encodeOwnerMetadata = (metadata: OwnerMetadata): Uint8Array =>
  new TextEncoder().encode(
    JSON.stringify({
      format: metadata.format,
      workspaceDigest: metadata.workspaceDigest,
      hostId: metadata.hostId,
      bootId: metadata.bootId,
      pid: metadata.pid,
      processStart: metadata.processStart,
      nonce: metadata.nonce,
    }),
  )

const decodeOwnerMetadata = (bytes: Uint8Array): OwnerMetadata | undefined => {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))
    const decoded = Schema.decodeUnknownResult(OwnerMetadata)(parsed)
    if (Result.isFailure(decoded)) return undefined
    const canonical = encodeOwnerMetadata(decoded.success)
    return canonical.length === bytes.length && canonical.every((byte, index) => byte === bytes[index])
      ? decoded.success
      : undefined
  } catch {
    return undefined
  }
}

const syncDirectory = (
  fileSystem: DurableFileSystem.DurableFileSystemService,
  path: string,
): Effect.Effect<void, DurableFileSystem.DurableFileSystemFailure | DurableFileSystem.UnsupportedDurability> =>
  Effect.acquireUseRelease(
    fileSystem.openDirectory(path),
    (directory) => directory.sync,
    (directory) => directory.close,
  )

const prepareLockRoot = (
  fileSystem: DurableFileSystem.DurableFileSystemService,
  workspace: string,
): Effect.Effect<void, WorkspaceLockFailure> =>
  Effect.gen(function* () {
    const entry = yield* fileSystem.inspect(workspace)
    if (entry === undefined) {
      return yield* Effect.fail(
        new DurableFileSystem.DurableFileSystemFailure({ operation: "workspace", code: "ENOENT" }),
      )
    }
    if (entry.type === "symlink" || entry.type !== "directory") {
      return yield* Effect.fail(new InvalidExecutionInput({ reason: "WorkspacePath" }))
    }
    const layout = ManagedPath.workspaceLockLayout(workspace)
    if (Result.isFailure(layout)) return yield* Effect.fail(new InvalidExecutionInput({ reason: "WorkspacePath" }))
    const lockPath = layout.success.lockDirectory.absolute
    for (const path of [
      join(workspace, ".effectify"),
      join(workspace, ".effectify", "app-builder"),
      dirname(lockPath),
    ]) {
      yield* DurableFileSystem.ensurePrivateDirectory(fileSystem, path, entry.device)
    }
  })

const makeMetadata = (workspace: string, identity: ProcessIdentity.ProcessInstance): OwnerMetadata => ({
  format: lockFormat,
  workspaceDigest: workspaceDigest(workspace),
  hostId: identity.hostId,
  bootId: identity.bootId,
  pid: identity.pid,
  processStart: identity.processStart,
  nonce: identity.nonce,
})

const writeMetadata = (
  fileSystem: DurableFileSystem.DurableFileSystemService,
  lockPath: string,
  metadataPath: string,
  metadata: Uint8Array,
): Effect.Effect<void, DurableFileSystem.DurableFileSystemFailure | DurableFileSystem.UnsupportedDurability> =>
  Effect.gen(function* () {
    yield* Effect.acquireUseRelease(
      fileSystem.createExclusive(metadataPath, DurableFileSystem.PrivateFileMode),
      (file) => file.writeAll(metadata).pipe(Effect.andThen(file.sync)),
      (file) => file.close,
    )
    yield* syncDirectory(fileSystem, lockPath)
    yield* syncDirectory(fileSystem, dirname(lockPath))
  })

const hasSafeWorkspacePath = (workspace: string): boolean =>
  isAbsolute(workspace) && !workspace.includes("\u0000") && resolve(workspace) === workspace

/** Creates an explicit, scoped lock service without ambient ownership defaults. */
export const make = (dependencies: Dependencies): WorkspaceLockService => {
  const acquire = Effect.fn("AppBuilder.WorkspaceLock.acquire")(function* (input: WithExclusiveInput) {
    if (!hasSafeWorkspacePath(input.workspace)) {
      return yield* Effect.fail(new InvalidExecutionInput({ reason: "WorkspacePath" }))
    }
    const workspace = resolve(input.workspace)
    const fileSystem = dependencies.fileSystem
    yield* DurableFileSystem.requireLockCapabilities(fileSystem)
    yield* prepareLockRoot(fileSystem, workspace)
    const lockPath = workspaceLockPath(workspace)
    const metadataPath = join(lockPath, ownerFile)
    const identity = yield* dependencies.processIdentity.current()
    const metadata = encodeOwnerMetadata(makeMetadata(workspace, identity))
    const created = yield* Effect.result(fileSystem.createPrivateDirectory(lockPath))

    if (Result.isSuccess(created)) {
      const published = yield* Effect.result(writeMetadata(fileSystem, lockPath, metadataPath, metadata))
      if (Result.isFailure(published)) {
        yield* created.success.rollback.pipe(Effect.result, Effect.asVoid)
        return yield* Effect.fail(published.failure)
      }
      return {
        ownership: Ownership.issueForScope({ workspace, lockPath }),
        workspace,
        lockPath,
        metadataPath,
        metadata,
      } satisfies LockLease
    }

    if (input.recover !== true) return yield* Effect.fail(new LockHeld({ workspace }))

    const existingBytes = yield* fileSystem.readFile(metadataPath).pipe(Effect.result)
    if (Result.isFailure(existingBytes)) {
      return yield* Effect.fail(new RecoveryDenied({ reason: "MissingOwnerEvidence" }))
    }
    const existing = decodeOwnerMetadata(existingBytes.success)
    if (existing === undefined || existing.workspaceDigest !== workspaceDigest(workspace)) {
      return yield* Effect.fail(new RecoveryDenied({ reason: "AmbiguousOwner" }))
    }
    const authorization = yield* dependencies.recoveryAuthority
      .authorize({ workspace, ...existing })
      .pipe(Effect.result)
    if (Result.isFailure(authorization)) return yield* Effect.fail(new RecoveryDenied({ reason: "NotAuthorized" }))
    const status = yield* dependencies.processIdentity.inspect(existing)
    if (status._tag !== "Dead") {
      return yield* Effect.fail(
        new RecoveryDenied({ reason: status._tag === "Unknown" ? "AmbiguousOwner" : "OwnerNotDead" }),
      )
    }
    const replaced = yield* fileSystem.replacePrivateDirectoryIfMetadataUnchanged(
      lockPath,
      metadataPath,
      existingBytes.success,
      metadata,
    )
    if (!replaced) return yield* Effect.fail(new LockEvidenceChanged({ workspace }))
    yield* syncDirectory(fileSystem, dirname(lockPath))
    return {
      ownership: Ownership.issueForScope({ workspace, lockPath }),
      workspace,
      lockPath,
      metadataPath,
      metadata,
    } satisfies LockLease
  })

  const release = Effect.fn("AppBuilder.WorkspaceLock.release")(function* (lease: LockLease) {
    if (!Ownership.isActiveFor(lease.ownership, lease.workspace, lease.lockPath)) {
      return yield* Effect.fail(new OwnershipRejected({ reason: "Inactive" }))
    }
    const removed = yield* dependencies.fileSystem.removePrivateDirectoryIfMetadataUnchanged(
      lease.lockPath,
      lease.metadataPath,
      lease.metadata,
    )
    if (!removed) return yield* Effect.fail(new LockEvidenceChanged({ workspace: lease.workspace }))
    yield* syncDirectory(dependencies.fileSystem, dirname(lease.lockPath))
  })

  return {
    withExclusive: (input, use) =>
      Effect.uninterruptibleMask((restore) =>
        Effect.acquireUseRelease(
          acquire(input),
          (lease) => restore(use(lease.ownership)),
          (lease, exit) =>
            (Exit.isSuccess(exit) ? release(lease) : Effect.void).pipe(
              Effect.ensuring(Effect.sync(() => Ownership.invalidate(lease.ownership))),
            ),
        ),
      ),
    withExclusiveFinalized: (input, use, afterRelease) =>
      Effect.uninterruptibleMask((restore) =>
        Effect.acquireUseRelease(
          acquire(input),
          (lease) => restore(use(lease.ownership)),
          (lease, exit) =>
            (Exit.isSuccess(exit) ? release(lease) : Effect.void).pipe(
              Effect.ensuring(Effect.sync(() => Ownership.invalidate(lease.ownership))),
            ),
        ).pipe(Effect.flatMap(({ value, payload }) => afterRelease(payload))),
      ),
  }
}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const fileSystem = yield* DurableFileSystem.Service
    const processIdentity = yield* ProcessIdentity.Service
    const recoveryAuthority = yield* LockRecoveryAuthority.Service
    return Service.of(make({ fileSystem, processIdentity, recoveryAuthority }))
  }),
)

export const withExclusive = <Value, Error, Requirements>(
  input: WithExclusiveInput,
  use: (ownership: Ownership.WorkspaceOwnership) => Effect.Effect<Value, Error, Requirements>,
): Effect.Effect<Value, Error | WorkspaceLockFailure, Service | Requirements> =>
  Effect.flatMap(Service, (service) => service.withExclusive(input, use))

export const ownerMetadataDigest = (metadata: Uint8Array): string =>
  toHex(createHash("sha256").update(metadata).digest())
