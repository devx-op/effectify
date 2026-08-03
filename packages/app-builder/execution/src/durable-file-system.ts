import { join } from "node:path"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as ManagedPath from "./managed-path.js"

export const PrivateDirectoryMode = 0o700
export const PrivateFileMode = 0o600

type Capability =
  | "privateAccessControl"
  | "noFollowPaths"
  | "noReplacePublish"
  | "fileSync"
  | "directorySync"
  | "atomicPrivateDirectory"
  | "compareMetadataDirectoryMutation"

export interface DurableCapabilities {
  readonly privateAccessControl: boolean
  readonly noFollowPaths: boolean
  readonly noReplacePublish: boolean
  readonly fileSync: boolean
  readonly directorySync: boolean
  readonly atomicPrivateDirectory: boolean
  readonly compareMetadataDirectoryMutation: boolean
}

export interface DurableFile {
  readonly writeAll: (bytes: Uint8Array) => Effect.Effect<void, DurableFileSystemFailure | UnsupportedDurability>
  readonly sync: Effect.Effect<void, DurableFileSystemFailure | UnsupportedDurability>
  readonly close: Effect.Effect<void, DurableFileSystemFailure | UnsupportedDurability>
}

export interface DurableDirectory {
  readonly sync: Effect.Effect<void, DurableFileSystemFailure | UnsupportedDurability>
  readonly close: Effect.Effect<void, DurableFileSystemFailure | UnsupportedDurability>
}

export interface DurableFileSystemService {
  readonly capabilities: DurableCapabilities
  readonly inspect: (
    path: string,
  ) => Effect.Effect<ManagedPath.ManagedEntry | undefined, DurableFileSystemFailure | UnsupportedDurability>
  readonly readDirectory: (
    path: string,
  ) => Effect.Effect<ReadonlyArray<string>, DurableFileSystemFailure | UnsupportedDurability>
  readonly readFile: (path: string) => Effect.Effect<Uint8Array, DurableFileSystemFailure | UnsupportedDurability>
  readonly createDirectory: (
    path: string,
    mode: number,
  ) => Effect.Effect<void, DurableFileSystemFailure | UnsupportedDurability>
  /** Atomically create a new private directory; an existing path is always a failure. */
  readonly createPrivateDirectory: (
    path: string,
  ) => Effect.Effect<DurableDirectory, DurableFileSystemFailure | UnsupportedDurability>
  readonly createExclusive: (
    path: string,
    mode: number,
  ) => Effect.Effect<DurableFile, DurableFileSystemFailure | UnsupportedDurability>
  readonly publishNoReplace: (
    temporaryPath: string,
    finalPath: string,
  ) => Effect.Effect<void, DurableFileSystemFailure | UnsupportedDurability>
  readonly openDirectory: (
    path: string,
  ) => Effect.Effect<DurableDirectory, DurableFileSystemFailure | UnsupportedDurability>
  readonly removeTree: (path: string) => Effect.Effect<void, DurableFileSystemFailure | UnsupportedDurability>
  /** Atomically replace private lock state only while its owner metadata bytes still match. */
  readonly replacePrivateDirectoryIfMetadataUnchanged: (
    directoryPath: string,
    metadataPath: string,
    expectedMetadata: Uint8Array,
    replacementMetadata: Uint8Array,
  ) => Effect.Effect<boolean, DurableFileSystemFailure | UnsupportedDurability>
  /** Atomically remove a private lock directory only while owner metadata bytes still match. */
  readonly removePrivateDirectoryIfMetadataUnchanged: (
    directoryPath: string,
    metadataPath: string,
    expectedMetadata: Uint8Array,
  ) => Effect.Effect<boolean, DurableFileSystemFailure | UnsupportedDurability>
}

export class UnsupportedDurability extends Schema.TaggedErrorClass<UnsupportedDurability>()("UnsupportedDurability", {
  capability: Schema.Literals([
    "privateAccessControl",
    "noFollowPaths",
    "noReplacePublish",
    "fileSync",
    "directorySync",
    "atomicPrivateDirectory",
    "compareMetadataDirectoryMutation",
  ]),
}) {}

export class DurableFileSystemFailure extends Schema.TaggedErrorClass<DurableFileSystemFailure>()(
  "DurableFileSystemFailure",
  { operation: Schema.String, code: Schema.String },
) {}

export type DurableFailure = DurableFileSystemFailure | UnsupportedDurability | ManagedPath.ManagedPathFailure

export class Service extends Context.Service<Service, DurableFileSystemService>()(
  "@effectify/app-builder-execution/DurableFileSystem",
) {}

const fromResult = <Value>(
  result: Result.Result<Value, ManagedPath.ManagedPathFailure>,
): Effect.Effect<Value, ManagedPath.ManagedPathFailure> =>
  Result.match(result, { onFailure: Effect.fail, onSuccess: Effect.succeed })

const unavailable = (capabilities: DurableCapabilities, capability: Capability) =>
  capabilities[capability] ? Effect.void : Effect.fail(new UnsupportedDurability({ capability }))

const nodeCapabilities: DurableCapabilities = Object.freeze({
  privateAccessControl: true,
  noFollowPaths: false,
  noReplacePublish: true,
  fileSync: true,
  directorySync: true,
  atomicPrivateDirectory: true,
  compareMetadataDirectoryMutation: true,
})

const noFollowUnavailable = <Value>(): Effect.Effect<Value, UnsupportedDurability> =>
  Effect.fail(new UnsupportedDurability({ capability: "noFollowPaths" }))

/** Node's path-string APIs cannot prove handle-relative no-follow operations, so this adapter fails closed. */
export const makeLive = (): DurableFileSystemService => ({
  capabilities: nodeCapabilities,
  inspect: () => noFollowUnavailable(),
  readDirectory: () => noFollowUnavailable(),
  readFile: () => noFollowUnavailable(),
  createDirectory: () => noFollowUnavailable(),
  createPrivateDirectory: () => noFollowUnavailable(),
  createExclusive: () => noFollowUnavailable(),
  publishNoReplace: () => noFollowUnavailable(),
  openDirectory: () => noFollowUnavailable(),
  removeTree: () => noFollowUnavailable(),
  replacePrivateDirectoryIfMetadataUnchanged: () => noFollowUnavailable(),
  removePrivateDirectoryIfMetadataUnchanged: () => noFollowUnavailable(),
})

export const live = Layer.succeed(Service, Service.of(makeLive()))

/** Reject adapters that cannot prove every durability property required for a committed journal. */
export const requireCapabilities = (fileSystem: DurableFileSystemService): Effect.Effect<void, UnsupportedDurability> =>
  Effect.gen(function* () {
    yield* unavailable(fileSystem.capabilities, "privateAccessControl")
    yield* unavailable(fileSystem.capabilities, "noFollowPaths")
    yield* unavailable(fileSystem.capabilities, "noReplacePublish")
    yield* unavailable(fileSystem.capabilities, "fileSync")
    yield* unavailable(fileSystem.capabilities, "directorySync")
  })

/** Reject lock acquisition adapters that cannot atomically create and compare private directory state. */
export const requireLockCapabilities = (
  fileSystem: DurableFileSystemService,
): Effect.Effect<void, UnsupportedDurability> =>
  Effect.gen(function* () {
    yield* requireCapabilities(fileSystem)
    yield* unavailable(fileSystem.capabilities, "atomicPrivateDirectory")
    yield* unavailable(fileSystem.capabilities, "compareMetadataDirectoryMutation")
  })

/** Create or revalidate one owner-private directory on the workspace device without following links. */
export const ensurePrivateDirectory = (
  fileSystem: DurableFileSystemService,
  path: string,
  expectedDevice: number,
): Effect.Effect<ManagedPath.ManagedEntry, DurableFailure> =>
  Effect.gen(function* () {
    yield* unavailable(fileSystem.capabilities, "privateAccessControl")
    const existing = yield* fileSystem.inspect(path)
    if (existing !== undefined) return yield* fromResult(ManagedPath.assertPrivateDirectory(existing, expectedDevice))
    yield* fileSystem.createDirectory(path, PrivateDirectoryMode)
    const created = yield* fileSystem.inspect(path)
    if (created === undefined) {
      return yield* Effect.fail(new DurableFileSystemFailure({ operation: "inspect", code: "MissingAfterCreate" }))
    }
    return yield* fromResult(ManagedPath.assertPrivateDirectory(created, expectedDevice))
  })

/** Establish the fixed run journal hierarchy below an existing workspace without accepting links or device changes. */
export const prepareRunJournalDirectory = (
  fileSystem: DurableFileSystemService,
  workspace: string,
  runIdentifier: string,
): Effect.Effect<ManagedPath.RunLayout, DurableFailure> =>
  Effect.gen(function* () {
    yield* requireCapabilities(fileSystem)
    const layout = yield* fromResult(ManagedPath.runLayout(workspace, runIdentifier))
    const workspaceEntry = yield* fileSystem.inspect(layout.workspace)
    if (workspaceEntry === undefined) {
      return yield* Effect.fail(new DurableFileSystemFailure({ operation: "workspace", code: "ENOENT" }))
    }
    if (workspaceEntry.type === "symlink")
      return yield* Effect.fail(new ManagedPath.ManagedPathPolicyViolation({ reason: "SymbolicLink" }))
    if (workspaceEntry.type !== "directory") {
      return yield* Effect.fail(new ManagedPath.ManagedPathPolicyViolation({ reason: "NonDirectoryAncestor" }))
    }
    for (const path of [
      join(layout.workspace, ".effectify"),
      join(layout.workspace, ".effectify", "app-builder"),
      layout.root,
      join(layout.root, "runs"),
      layout.runDirectory.absolute,
      layout.journalDirectory.absolute,
    ]) {
      yield* ensurePrivateDirectory(fileSystem, path, workspaceEntry.device)
    }
    return layout
  })

/** Establish the fixed draft hierarchy below an existing workspace without accepting links or device changes. */
export const prepareDraftDirectory = (
  fileSystem: DurableFileSystemService,
  workspace: string,
  draftId: string,
): Effect.Effect<ManagedPath.DraftLayout, DurableFailure> =>
  Effect.gen(function* () {
    yield* requireCapabilities(fileSystem)
    const layout = yield* fromResult(ManagedPath.draftLayout(workspace, draftId))
    const workspaceEntry = yield* fileSystem.inspect(layout.workspace)
    if (workspaceEntry === undefined) {
      return yield* Effect.fail(new DurableFileSystemFailure({ operation: "workspace", code: "ENOENT" }))
    }
    if (workspaceEntry.type === "symlink")
      return yield* Effect.fail(new ManagedPath.ManagedPathPolicyViolation({ reason: "SymbolicLink" }))
    if (workspaceEntry.type !== "directory") {
      return yield* Effect.fail(new ManagedPath.ManagedPathPolicyViolation({ reason: "NonDirectoryAncestor" }))
    }
    for (const path of [
      join(layout.workspace, ".effectify"),
      join(layout.workspace, ".effectify", "app-builder"),
      layout.root,
      join(layout.root, "drafts"),
      layout.draftDirectory.absolute,
    ]) {
      yield* ensurePrivateDirectory(fileSystem, path, workspaceEntry.device)
    }
    return layout
  })
