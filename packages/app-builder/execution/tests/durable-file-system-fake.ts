import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"
import { basename, dirname } from "node:path"
import * as DurableFileSystem from "../src/durable-file-system.js"
import type * as ManagedPath from "../src/managed-path.js"

export type CrashStage = "beforePublish" | "afterPublish" | "fileSync" | "journalDirectorySync" | "snapshotPublish"

export interface FakeOptions {
  readonly workspace?: string
  readonly crashAt?: CrashStage
  readonly capabilities?: Partial<DurableFileSystem.DurableCapabilities>
  readonly workspaceEntry?: ManagedPath.ManagedEntry
}

export interface FakeDurableFileSystem {
  readonly fileSystem: DurableFileSystem.DurableFileSystemService
  readonly operations: Ref.Ref<ReadonlyArray<string>>
  readonly published: Deferred.Deferred<string>
  readonly contents: ReadonlyMap<string, Uint8Array>
  readonly setContents: (path: string, bytes: Uint8Array) => void
}

const failure = (operation: string): DurableFileSystem.DurableFileSystemFailure =>
  new DurableFileSystem.DurableFileSystemFailure({ operation, code: "InjectedCrash" })

/** Deterministic durability seam: Ref captures every stage and Deferred exposes publication without timing. */
export const makeFakeDurableFileSystem = (options: FakeOptions = {}): Effect.Effect<FakeDurableFileSystem> =>
  Effect.gen(function* () {
    const workspace = options.workspace ?? "/workspace"
    const operations = yield* Ref.make<ReadonlyArray<string>>([])
    const published = yield* Deferred.make<string>()
    const entries = new Map<string, ManagedPath.ManagedEntry>([
      [workspace, options.workspaceEntry ?? { type: "directory", device: 1, mode: 0o755 }],
    ])
    const contents = new Map<string, Uint8Array>()
    const capabilities: DurableFileSystem.DurableCapabilities = {
      privateAccessControl: true,
      noFollowPaths: true,
      noReplacePublish: true,
      fileSync: true,
      directorySync: true,
      atomicPrivateDirectory: true,
      compareMetadataDirectoryMutation: true,
      ...options.capabilities,
    }
    const record = (operation: string) => Ref.update(operations, (current) => Object.freeze([...current, operation]))
    const shouldCrash = (stage: CrashStage) => options.crashAt === stage
    const fileSystem: DurableFileSystem.DurableFileSystemService = {
      capabilities,
      inspect: (path) => record(`inspect:${path}`).pipe(Effect.as(entries.get(path))),
      readDirectory: (path) =>
        record(`readDirectory:${path}`).pipe(
          Effect.as(
            Array.from(entries.keys(), (candidate) => (dirname(candidate) === path ? basename(candidate) : undefined))
              .filter((entry): entry is string => entry !== undefined)
              .sort(),
          ),
        ),
      readFile: (path) =>
        record(`readFile:${path}`).pipe(
          Effect.flatMap(() => {
            const bytes = contents.get(path)
            return bytes === undefined ? Effect.fail(failure("readFile")) : Effect.succeed(bytes)
          }),
        ),
      createDirectory: (path, mode) =>
        record(`mkdir:${path}`).pipe(
          Effect.tap(() => Effect.sync(() => entries.set(path, { type: "directory", device: 1, mode }))),
        ),
      createPrivateDirectory: (path) =>
        record(`createPrivateDirectory:${path}`).pipe(
          Effect.andThen(() =>
            entries.has(path)
              ? Effect.fail(failure("createPrivateDirectory"))
              : Effect.sync(() => {
                  const entry = { type: "directory" as const, device: 1, mode: DurableFileSystem.PrivateDirectoryMode }
                  entries.set(path, entry)
                  return entry
                }),
          ),
          Effect.map((entry) => ({
            sync: record(`directorySync:${path}`),
            close: record(`directoryClose:${path}`),
            rollback: record(`rollbackPrivateDirectory:${path}`).pipe(
              Effect.flatMap(() => {
                if (entries.get(path) !== entry) return Effect.succeed(false)
                return Effect.sync(() => {
                  for (const candidate of entries.keys()) {
                    if (candidate === path || candidate.startsWith(`${path}/`)) {
                      entries.delete(candidate)
                      contents.delete(candidate)
                    }
                  }
                  return true
                })
              }),
            ),
          })),
        ),
      createExclusive: (path, mode) =>
        record(`create:${path}`).pipe(
          Effect.andThen(() =>
            entries.has(path)
              ? Effect.fail(failure("createExclusive"))
              : Effect.sync(() => entries.set(path, { type: "file", device: 1, mode })),
          ),
          Effect.as({
            writeAll: (bytes: Uint8Array) =>
              record(`write:${path}`).pipe(Effect.tap(() => Effect.sync(() => contents.set(path, bytes)))),
            sync: record(`fileSync:${path}`).pipe(
              Effect.andThen(shouldCrash("fileSync") ? Effect.fail(failure("fileSync")) : Effect.void),
            ),
            close: record(`close:${path}`),
          }),
        ),
      publishNoReplace: (temporaryPath, finalPath) =>
        record(`publish:${finalPath}`).pipe(
          Effect.andThen(shouldCrash("beforePublish") ? Effect.fail(failure("publish")) : Effect.void),
          Effect.andThen(() => {
            if (entries.has(finalPath)) return Effect.fail(failure("publishNoReplace"))
            return Effect.sync(() => {
              const bytes = contents.get(temporaryPath)
              entries.set(finalPath, { type: "file", device: 1, mode: DurableFileSystem.PrivateFileMode })
              if (bytes !== undefined) contents.set(finalPath, bytes)
              entries.delete(temporaryPath)
              contents.delete(temporaryPath)
            })
          }),
          Effect.tap(() => Deferred.succeed(published, finalPath)),
          Effect.andThen(
            shouldCrash(finalPath.endsWith("snapshot.json") ? "snapshotPublish" : "afterPublish")
              ? Effect.fail(failure("publish"))
              : Effect.void,
          ),
        ),
      openDirectory: (path) =>
        record(`openDirectory:${path}`).pipe(
          Effect.as({
            sync: record(`directorySync:${path}`).pipe(
              Effect.andThen(
                shouldCrash("journalDirectorySync") && path.endsWith("journal")
                  ? Effect.fail(failure("directorySync"))
                  : Effect.void,
              ),
            ),
            close: record(`directoryClose:${path}`),
          }),
        ),
      removeTree: (path) =>
        record(`removeTree:${path}`).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              for (const candidate of entries.keys()) {
                if (candidate === path || candidate.startsWith(`${path}/`)) {
                  entries.delete(candidate)
                  contents.delete(candidate)
                }
              }
            }),
          ),
        ),
      replacePrivateDirectoryIfMetadataUnchanged: (
        directoryPath,
        metadataPath,
        expectedMetadata,
        replacementMetadata,
      ) =>
        record(`replacePrivateDirectoryIfMetadataUnchanged:${directoryPath}`).pipe(
          Effect.flatMap(() => {
            const current = contents.get(metadataPath)
            const matches =
              current !== undefined &&
              current.length === expectedMetadata.length &&
              current.every((byte, index) => byte === expectedMetadata[index])
            if (!matches) return Effect.succeed(false)
            return Effect.sync(() => {
              for (const candidate of entries.keys()) {
                if (candidate === directoryPath || candidate.startsWith(`${directoryPath}/`)) {
                  entries.delete(candidate)
                  contents.delete(candidate)
                }
              }
              entries.set(directoryPath, {
                type: "directory",
                device: 1,
                mode: DurableFileSystem.PrivateDirectoryMode,
              })
              entries.set(metadataPath, { type: "file", device: 1, mode: DurableFileSystem.PrivateFileMode })
              contents.set(metadataPath, replacementMetadata)
              return true
            })
          }),
        ),
      removePrivateDirectoryIfMetadataUnchanged: (directoryPath, metadataPath, expectedMetadata) =>
        record(`removePrivateDirectoryIfMetadataUnchanged:${directoryPath}`).pipe(
          Effect.flatMap(() => {
            const current = contents.get(metadataPath)
            const matches =
              current !== undefined &&
              current.length === expectedMetadata.length &&
              current.every((byte, index) => byte === expectedMetadata[index])
            if (!matches) return Effect.succeed(false)
            return Effect.sync(() => {
              for (const candidate of entries.keys()) {
                if (candidate === directoryPath || candidate.startsWith(`${directoryPath}/`)) {
                  entries.delete(candidate)
                  contents.delete(candidate)
                }
              }
              return true
            })
          }),
        ),
    }
    return { fileSystem, operations, published, contents, setContents: (path, bytes) => contents.set(path, bytes) }
  })
