import { randomUUID } from "node:crypto"
import { basename, dirname, isAbsolute, join } from "node:path"
import * as Effect from "effect/Effect"
import * as ManagedPath from "../managed-path.js"
import {
  DurableFileSystemFailure,
  type CreatedPrivateDirectory,
  type DurableDirectory,
  type DurableFile,
  type DurableFileSystemService,
  type TreeEntry,
  UnsupportedDurability,
} from "../durable-file-system.js"
import { makePosixBindings, type PosixBindings, type PosixStat } from "./posix-bindings.js"

export type { PosixBindings, PosixDirectoryEntry, PosixStat } from "./posix-bindings.js"

type Failure = DurableFileSystemFailure | UnsupportedDurability
type Temporary = { readonly device: number; readonly inode: number }
type PathParts = { readonly parent: string; readonly leaf: string }

const failure = (operation: string, code: string): DurableFileSystemFailure =>
  new DurableFileSystemFailure({ operation, code })
const bytesEqual = (left: Uint8Array | undefined, right: Uint8Array | undefined): boolean =>
  left === undefined || right === undefined
    ? left === right
    : left.length === right.length && left.every((byte, index) => byte === right[index])
const treesEqual = (left: ReadonlyArray<TreeEntry>, right: ReadonlyArray<TreeEntry>): boolean =>
  left.length === right.length &&
  left.every(
    (entry, index) =>
      entry.path === right[index]?.path &&
      entry.type === right[index]?.type &&
      bytesEqual(entry.bytes, right[index]?.bytes),
  )

const splitPath = (path: string): Effect.Effect<PathParts, DurableFileSystemFailure> => {
  if (!isAbsolute(path) || path === "/") return Effect.fail(failure("path", "InvalidPath"))
  const segments = path.slice(1).split("/")
  if (
    segments.some((segment) => segment.length === 0 || segment === "." || segment === ".." || segment.includes("\0"))
  ) {
    return Effect.fail(failure("path", "InvalidPath"))
  }
  return Effect.succeed({ parent: dirname(path), leaf: basename(path) })
}

const entryOf = (profile: PosixBindings["profile"], stat: PosixStat): ManagedPath.ManagedEntry => ({
  device: stat.device,
  mode: stat.mode,
  type:
    (stat.mode & profile.fileTypes.mask) === profile.fileTypes.directory
      ? "directory"
      : (stat.mode & profile.fileTypes.mask) === profile.fileTypes.file
        ? "file"
        : (stat.mode & profile.fileTypes.mask) === profile.fileTypes.symlink
          ? "symlink"
          : "other",
})

/** Effect-first handle-relative POSIX adapter. Every host call is synchronous, contained, and immediately observes errno. */
export const makePosixDurableFileSystem = (bindings: PosixBindings): DurableFileSystemService => {
  const { profile } = bindings
  const temporary = new Map<string, Temporary>()
  const code = (value: number): string =>
    value === 2
      ? "ENOENT"
      : value === profile.errno.interrupted
        ? "EINTR"
        : value === profile.errno.io
          ? "EIO"
          : value === profile.errno.exists
            ? "EEXIST"
            : value === profile.errno.noSystem
              ? "ENOSYS"
              : value === profile.errno.invalid
                ? "EINVAL"
                : value === profile.errno.notSupported
                  ? "ENOTSUP"
                  : value === profile.errno.operationNotSupported
                    ? "EOPNOTSUPP"
                    : `errno:${value}`
  const native = <Value>(operation: string, thunk: () => Value): Effect.Effect<Value, DurableFileSystemFailure> =>
    Effect.try({ try: thunk, catch: () => failure(operation, "NativeException") })
  const result = (operation: string, thunk: () => number): Effect.Effect<void, DurableFileSystemFailure> =>
    native(operation, () => {
      const value = thunk()
      return value === -1 ? ([value, bindings.errno()] as const) : ([value, 0] as const)
    }).pipe(Effect.flatMap(([, errno]) => (errno === 0 ? Effect.void : Effect.fail(failure(operation, code(errno))))))
  const open = (
    operation: string,
    directory: number,
    path: string,
    flags: number,
    mode?: number,
  ): Effect.Effect<number, DurableFileSystemFailure> =>
    native(operation, () => {
      const descriptor = bindings.openAt(directory, path, flags, mode)
      return descriptor === -1 ? ([descriptor, bindings.errno()] as const) : ([descriptor, 0] as const)
    }).pipe(
      Effect.flatMap(([descriptor, errno]) =>
        errno === 0 ? Effect.succeed(descriptor) : Effect.fail(failure(operation, code(errno))),
      ),
    )
  const close = (descriptor: number): Effect.Effect<void, DurableFileSystemFailure> =>
    result("close", () => bindings.close(descriptor))
  const ignore = (effect: Effect.Effect<unknown, Failure>): Effect.Effect<void> => Effect.ignore(effect)
  const stat = (descriptor: number): Effect.Effect<PosixStat, DurableFileSystemFailure> =>
    native("fstat", () => {
      const [status, value] = bindings.fstat(descriptor)
      return status === -1 ? ([value, bindings.errno()] as const) : ([value, 0] as const)
    }).pipe(
      Effect.flatMap(([value, errno]) =>
        errno !== 0
          ? Effect.fail(failure("fstat", code(errno)))
          : value === undefined
            ? Effect.fail(failure("fstat", "InvalidStat"))
            : Effect.succeed(value),
      ),
    )
  const statAt = (directory: number, path: string): Effect.Effect<PosixStat, DurableFileSystemFailure> =>
    native("fstatat", () => {
      const [status, value] = bindings.fstatAt(directory, path, profile.flags.at.noFollow)
      return status === -1 ? ([value, bindings.errno()] as const) : ([value, 0] as const)
    }).pipe(
      Effect.flatMap(([value, errno]) =>
        errno !== 0
          ? Effect.fail(failure("fstatat", code(errno)))
          : value === undefined
            ? Effect.fail(failure("fstatat", "InvalidStat"))
            : Effect.succeed(value),
      ),
    )
  const directoryFlags =
    profile.flags.open.readOnly |
    profile.flags.open.directory |
    profile.flags.open.noFollow |
    profile.flags.open.closeOnExec
  const openDirectory = (path: string): Effect.Effect<number, DurableFileSystemFailure> =>
    Effect.gen(function* () {
      if (!isAbsolute(path)) return yield* Effect.fail(failure("openDirectory", "InvalidPath"))
      const segments = path === "/" ? [] : path.slice(1).split("/")
      if (
        segments.some(
          (segment) => segment.length === 0 || segment === "." || segment === ".." || segment.includes("\0"),
        )
      )
        return yield* Effect.fail(failure("openDirectory", "InvalidPath"))
      let current = yield* open("openat", profile.flags.atFdcwd, "/", directoryFlags)
      for (const segment of segments) {
        const next = yield* open("openat", current, segment, directoryFlags).pipe(
          Effect.tapError(() => ignore(close(current))),
        )
        const nextStat = yield* stat(next).pipe(Effect.tapError(() => ignore(close(next))))
        if (entryOf(profile, nextStat).type !== "directory") {
          yield* ignore(close(next))
          yield* ignore(close(current))
          return yield* Effect.fail(failure("openat", "ENOTDIR"))
        }
        yield* close(current)
        current = next
      }
      return current
    })
  const openParent = (path: string): Effect.Effect<readonly [number, string], DurableFileSystemFailure> =>
    splitPath(path).pipe(
      Effect.flatMap((parts) =>
        openDirectory(parts.parent).pipe(Effect.map((parent) => [parent, parts.leaf] as const)),
      ),
    )
  const sync = (descriptor: number, operation: string): Effect.Effect<void, DurableFileSystemFailure> =>
    result(operation, () => bindings.fsync(descriptor)).pipe(
      Effect.andThen(
        profile.platform === "darwin" ? result("fcntl(F_FULLFSYNC)", () => bindings.fullSync(descriptor)) : Effect.void,
      ),
    )
  const rollbackTemporary = (path: string, expected: Temporary): Effect.Effect<void, DurableFileSystemFailure> =>
    openParent(path).pipe(
      Effect.flatMap(([parent, leaf]) =>
        statAt(parent, leaf).pipe(
          Effect.flatMap((current) =>
            current.device === expected.device && current.inode === expected.inode
              ? result("unlinkat", () => bindings.unlinkAt(parent, leaf, 0)).pipe(
                  Effect.andThen(sync(parent, "parentSync")),
                )
              : Effect.void,
          ),
          Effect.ensuring(ignore(close(parent))),
        ),
      ),
      Effect.tap(() => Effect.sync(() => temporary.delete(path))),
    )
  const cleanup = <Value>(
    path: string,
    expected: Temporary,
    cause: Failure,
    closeCurrent: Effect.Effect<void, DurableFileSystemFailure>,
  ): Effect.Effect<Value, Failure> =>
    ignore(closeCurrent).pipe(
      Effect.andThen(ignore(rollbackTemporary(path, expected))),
      Effect.andThen(Effect.fail(cause)),
    )
  const createExclusive = (path: string, mode: number): Effect.Effect<DurableFile, Failure> =>
    openParent(path).pipe(
      Effect.flatMap(([parent, leaf]) =>
        Effect.gen(function* () {
          const flags =
            profile.flags.open.writeOnly |
            profile.flags.open.create |
            profile.flags.open.exclusive |
            profile.flags.open.noFollow |
            profile.flags.open.closeOnExec
          const descriptor = yield* open("openat", parent, leaf, flags, mode).pipe(
            Effect.ensuring(ignore(close(parent))),
          )
          const recorded = yield* stat(descriptor).pipe(Effect.tapError(() => ignore(close(descriptor))))
          if (entryOf(profile, recorded).type !== "file") {
            yield* ignore(close(descriptor))
            return yield* Effect.fail(failure("openat", "NotRegularFile"))
          }
          yield* result("fchmod", () => bindings.fchmod(descriptor, mode)).pipe(
            Effect.tapError(() => ignore(close(descriptor))),
          )
          const identity = { device: recorded.device, inode: recorded.inode }
          yield* Effect.sync(() => temporary.set(path, identity))
          let closed = false
          const closeOnce = (): Effect.Effect<void, DurableFileSystemFailure> => {
            if (closed) return Effect.void
            closed = true
            return close(descriptor)
          }
          const guarded = (
            effect: Effect.Effect<void, DurableFileSystemFailure>,
            closeOnFailure: boolean,
          ): Effect.Effect<void, Failure> =>
            effect.pipe(
              Effect.catch((cause) => cleanup(path, identity, cause, closeOnFailure ? closeOnce() : Effect.void)),
            )
          return {
            writeAll: (bytes) =>
              guarded(
                Effect.gen(function* () {
                  let offset = 0
                  while (offset < bytes.length) {
                    const count = yield* native("write", () => {
                      const value = bindings.write(descriptor, bytes.subarray(offset))
                      return value === -1 ? ([value, bindings.errno()] as const) : ([value, 0] as const)
                    })
                    if (count[1] !== 0) {
                      if (count[1] === profile.errno.interrupted) continue
                      return yield* Effect.fail(failure("write", code(count[1])))
                    }
                    if (count[0] === 0) return yield* Effect.fail(failure("write", "EIO"))
                    offset += count[0]
                  }
                }),
                true,
              ),
            sync: guarded(sync(descriptor, "fsync"), true),
            close: closeOnce().pipe(Effect.catch((cause) => cleanup(path, identity, cause, Effect.void))),
          }
        }),
      ),
    )
  const removeRecordedTemporary = (path: string): Effect.Effect<void, DurableFileSystemFailure> => {
    const identity = temporary.get(path)
    return identity === undefined
      ? Effect.fail(failure("rollback-temp", "UntrackedTemporary"))
      : rollbackTemporary(path, identity)
  }
  const publishNoReplace = (temporaryPath: string, finalPath: string): Effect.Effect<void, Failure> => {
    const identity = temporary.get(temporaryPath)
    if (identity === undefined) return Effect.fail(failure("rename", "UntrackedTemporary"))
    return openParent(temporaryPath).pipe(
      Effect.flatMap(([fromDirectory, from]) =>
        openParent(finalPath).pipe(
          Effect.flatMap(([toDirectory, to]) =>
            native("rename", () => {
              const value = bindings.rename(fromDirectory, from, toDirectory, to, profile.flags.rename.noReplace)
              return value === -1 ? ([value, bindings.errno()] as const) : ([value, 0] as const)
            }).pipe(
              Effect.flatMap(([, errno]) => {
                if (errno === 0)
                  return Effect.sync(() => temporary.delete(temporaryPath)).pipe(
                    Effect.andThen(sync(toDirectory, "parentSync")),
                  )
                const original = failure("rename", code(errno))
                const expectedFailure =
                  errno === profile.errno.exists ||
                  [
                    profile.errno.noSystem,
                    profile.errno.invalid,
                    profile.errno.notSupported,
                    profile.errno.operationNotSupported,
                  ].includes(errno)
                if (expectedFailure)
                  return removeRecordedTemporary(temporaryPath).pipe(Effect.andThen(Effect.fail(original)))
                return statAt(fromDirectory, from).pipe(
                  Effect.flatMap((current) =>
                    current.device === identity.device && current.inode === identity.inode
                      ? removeRecordedTemporary(temporaryPath).pipe(Effect.andThen(Effect.fail(original)))
                      : Effect.fail(failure("rename", "PublicationIndeterminate")),
                  ),
                  Effect.catch(() => Effect.fail(failure("rename", "PublicationIndeterminate"))),
                )
              }),
              Effect.ensuring(ignore(close(toDirectory))),
            ),
          ),
          Effect.ensuring(ignore(close(fromDirectory))),
        ),
      ),
    )
  }
  const inspect = (path: string): Effect.Effect<ManagedPath.ManagedEntry | undefined, Failure> =>
    openParent(path).pipe(
      Effect.flatMap(([parent, leaf]) =>
        statAt(parent, leaf).pipe(
          Effect.map((value) => entryOf(profile, value)),
          Effect.catch((error) => (error.code === "ENOENT" ? Effect.succeed(undefined) : Effect.fail(error))),
          Effect.ensuring(ignore(close(parent))),
        ),
      ),
    )
  const readDirectory = (path: string): Effect.Effect<ReadonlyArray<string>, Failure> =>
    openDirectory(path).pipe(
      Effect.flatMap((descriptor) =>
        Effect.gen(function* () {
          const duplicate = yield* native("dup", () => {
            const value = bindings.dup(descriptor)
            return value === -1 ? ([value, bindings.errno()] as const) : ([value, 0] as const)
          }).pipe(
            Effect.flatMap(([value, errno]) =>
              errno === 0 ? Effect.succeed(value) : Effect.fail(failure("dup", code(errno))),
            ),
          )
          const directory = yield* native("fdopendir", () => {
            const value = bindings.fdopendir(duplicate)
            return { value, errno: value === undefined ? bindings.errno() : 0 }
          }).pipe(
            Effect.flatMap(({ value, errno }) =>
              value === undefined ? Effect.fail(failure("fdopendir", code(errno))) : Effect.succeed(value),
            ),
            Effect.tapError(() => ignore(close(duplicate))),
          )
          return yield* Effect.gen(function* () {
            const names: Array<string> = []
            while (true) {
              bindings.clearErrno()
              const entry = yield* native("readdir", () => bindings.readdir(directory))
              if (entry === undefined) {
                const errno = bindings.errno()
                if (errno === 0) break
                return yield* Effect.fail(failure("readdir", code(errno)))
              }
              if (entry.name !== "." && entry.name !== "..") names.push(entry.name)
            }
            return names.sort()
          }).pipe(Effect.ensuring(ignore(result("closedir", () => bindings.closedir(directory)))))
        }).pipe(Effect.ensuring(ignore(close(descriptor)))),
      ),
    )
  const readFile = (path: string): Effect.Effect<Uint8Array, Failure> =>
    openParent(path).pipe(
      Effect.flatMap(([parent, leaf]) =>
        open(
          "openat",
          parent,
          leaf,
          profile.flags.open.readOnly | profile.flags.open.noFollow | profile.flags.open.closeOnExec,
        ).pipe(
          Effect.ensuring(ignore(close(parent))),
          Effect.flatMap((descriptor) =>
            Effect.gen(function* () {
              const details = yield* stat(descriptor)
              if (entryOf(profile, details).type !== "file")
                return yield* Effect.fail(failure("read", "NotRegularFile"))
              const chunks: Array<Uint8Array> = []
              while (true) {
                const [count, bytes] = yield* native("read", () => bindings.read(descriptor, 65536))
                if (count === -1) {
                  const errno = bindings.errno()
                  if (errno === profile.errno.interrupted) continue
                  return yield* Effect.fail(failure("read", code(errno)))
                }
                if (count === 0) break
                chunks.push(bytes)
              }
              const length = chunks.reduce((total, chunk) => total + chunk.length, 0)
              const output = new Uint8Array(length)
              let offset = 0
              for (const chunk of chunks) {
                output.set(chunk, offset)
                offset += chunk.length
              }
              return output
            }).pipe(Effect.ensuring(ignore(close(descriptor)))),
          ),
        ),
      ),
    )
  const openDurableDirectory = (path: string): Effect.Effect<DurableDirectory, Failure> =>
    openDirectory(path).pipe(
      Effect.map((descriptor) => ({ sync: sync(descriptor, "directorySync"), close: close(descriptor) })),
    )
  const rollbackAfterDirectoryFailure = (
    path: string,
    created: PosixStat,
    cause: Failure,
  ): Effect.Effect<never, Failure> =>
    rollbackPrivateDirectory(path, created).pipe(Effect.ignore, Effect.andThen(Effect.fail(cause)))
  const createRecordedDirectory = (path: string, mode: number): Effect.Effect<PosixStat, Failure> =>
    openParent(path).pipe(
      Effect.flatMap(([parent, leaf]) =>
        result("mkdirat", () => bindings.mkdirAt(parent, leaf, mode)).pipe(
          Effect.andThen(statAt(parent, leaf)),
          Effect.flatMap((created) =>
            open("openat", parent, leaf, directoryFlags).pipe(
              Effect.flatMap((child) =>
                stat(child).pipe(
                  Effect.andThen(result("fchmod", () => bindings.fchmod(child, mode))),
                  Effect.andThen(sync(child, "directorySync")),
                  Effect.ensuring(ignore(close(child))),
                ),
              ),
              Effect.andThen(sync(parent, "parentSync")),
              Effect.as(created),
              Effect.catch((cause) => rollbackAfterDirectoryFailure(path, created, cause)),
            ),
          ),
          Effect.ensuring(ignore(close(parent))),
        ),
      ),
    )
  const createDirectory = (path: string, mode: number): Effect.Effect<void, Failure> =>
    createRecordedDirectory(path, mode).pipe(Effect.asVoid)
  const rollbackPrivateDirectory = (path: string, created: PosixStat): Effect.Effect<boolean, Failure> =>
    openParent(path).pipe(
      Effect.flatMap(([parent, leaf]) =>
        statAt(parent, leaf).pipe(
          Effect.flatMap((current) =>
            current.device !== created.device || current.inode !== created.inode
              ? Effect.succeed(false)
              : result("unlinkat", () => bindings.unlinkAt(parent, leaf, profile.flags.at.removeDirectory)).pipe(
                  Effect.andThen(sync(parent, "parentSync")),
                  Effect.as(true),
                ),
          ),
          Effect.ensuring(ignore(close(parent))),
        ),
      ),
    )
  const createPrivateDirectory = (path: string): Effect.Effect<CreatedPrivateDirectory, Failure> =>
    createRecordedDirectory(path, profile.modes.directory).pipe(
      Effect.flatMap((created) =>
        openDirectory(path).pipe(
          Effect.flatMap((descriptor) =>
            stat(descriptor).pipe(
              Effect.tapError(() => ignore(close(descriptor))),
              Effect.map(() => {
                let closed = false
                const closeOnce = (): Effect.Effect<void, DurableFileSystemFailure> => {
                  if (closed) return Effect.void
                  closed = true
                  return close(descriptor)
                }
                return {
                  sync: sync(descriptor, "directorySync"),
                  close: closeOnce(),
                  rollback: closeOnce().pipe(Effect.andThen(rollbackPrivateDirectory(path, created))),
                }
              }),
            ),
          ),
          Effect.catch((cause) => rollbackAfterDirectoryFailure(path, created, cause)),
        ),
      ),
    )
  const captureTree = (path: string): Effect.Effect<ReadonlyArray<TreeEntry>, Failure> =>
    inspect(path).pipe(
      Effect.flatMap((entry) => {
        if (entry === undefined) return Effect.fail(failure("captureTree", "ENOENT"))
        if (entry.type === "file") return readFile(path).pipe(Effect.map((bytes) => [{ path, type: "file", bytes }]))
        if (entry.type !== "directory") return Effect.fail(failure("captureTree", "UnsupportedEntry"))
        return readDirectory(path).pipe(
          Effect.flatMap((names) => Effect.all(names.map((name) => captureTree(join(path, name))))),
          Effect.map((children) => [{ path, type: "directory" }, ...children.flat()]),
        )
      }),
    )
  const removeDetached = (path: string): Effect.Effect<void, Failure> =>
    inspect(path).pipe(
      Effect.flatMap((entry) => {
        if (entry === undefined) return Effect.void
        if (entry.type === "file") {
          return openParent(path).pipe(
            Effect.flatMap(([parent, leaf]) =>
              result("unlinkat", () => bindings.unlinkAt(parent, leaf, 0)).pipe(
                Effect.andThen(sync(parent, "parentSync")),
                Effect.ensuring(ignore(close(parent))),
              ),
            ),
          )
        }
        if (entry.type !== "directory") return Effect.fail(failure("removeTree", "UnsupportedEntry"))
        return readDirectory(path).pipe(
          Effect.flatMap((names) => Effect.all(names.map((name) => removeDetached(join(path, name))))),
          Effect.andThen(openParent(path)),
          Effect.flatMap(([parent, leaf]) =>
            result("unlinkat", () => bindings.unlinkAt(parent, leaf, profile.flags.at.removeDirectory)).pipe(
              Effect.andThen(sync(parent, "parentSync")),
              Effect.ensuring(ignore(close(parent))),
            ),
          ),
        )
      }),
    )
  const relocated = (tree: ReadonlyArray<TreeEntry>, from: string, to: string): ReadonlyArray<TreeEntry> =>
    tree.map((entry) => ({ ...entry, path: entry.path === from ? to : `${to}${entry.path.slice(from.length)}` }))
  const sentinelPath = (path: string): string =>
    join(dirname(path), `.${basename(path)}.effectify-sentinel-${randomUUID()}`)
  const exchange = (parent: number, left: string, right: string): Effect.Effect<void, DurableFileSystemFailure> =>
    result("renameat-exchange", () => bindings.rename(parent, left, parent, right, profile.flags.rename.exchange))
  const directoryIdentity = (path: string): Effect.Effect<PosixStat, Failure> =>
    openDirectory(path).pipe(
      Effect.flatMap((descriptor) => stat(descriptor).pipe(Effect.ensuring(ignore(close(descriptor))))),
    )
  const withSentinel = (
    path: string,
    prepare: (sentinel: string) => Effect.Effect<void, Failure>,
    matches: (sentinel: string) => Effect.Effect<boolean, Failure>,
    commit: (path: string, sentinel: string, identity: PosixStat) => Effect.Effect<boolean, Failure>,
  ): Effect.Effect<boolean, Failure> =>
    splitPath(path).pipe(
      Effect.flatMap(({ parent, leaf }) => {
        const sentinel = sentinelPath(path)
        const sentinelLeaf = basename(sentinel)
        return createPrivateDirectory(sentinel).pipe(
          Effect.flatMap((created) =>
            created.close.pipe(
              Effect.andThen(Effect.all([directoryIdentity(sentinel), prepare(sentinel), openDirectory(parent)])),
              Effect.flatMap(([identity, , parentDescriptor]) => {
                const restore = exchange(parentDescriptor, sentinelLeaf, leaf).pipe(
                  Effect.andThen(removeDetached(sentinel)),
                  Effect.andThen(sync(parentDescriptor, "parentSync")),
                )
                return result("flock", () => bindings.flock(parentDescriptor, 2)).pipe(
                  Effect.andThen(
                    exchange(parentDescriptor, leaf, sentinelLeaf).pipe(
                      Effect.andThen(
                        matches(sentinel).pipe(
                          Effect.catch((cause) => restore.pipe(Effect.andThen(Effect.fail(cause)))),
                        ),
                      ),
                      Effect.flatMap((matched) =>
                        matched
                          ? commit(path, sentinel, identity).pipe(
                              Effect.flatMap((committed) =>
                                committed
                                  ? sync(parentDescriptor, "parentSync").pipe(Effect.as(true))
                                  : Effect.succeed(false),
                              ),
                            )
                          : restore.pipe(Effect.as(false)),
                      ),
                    ),
                  ),
                  Effect.ensuring(ignore(result("flock", () => bindings.flock(parentDescriptor, 8)))),
                  Effect.ensuring(ignore(close(parentDescriptor))),
                )
              }),
            ),
          ),
        )
      }),
    )
  const removeTreeIfUnchanged = (path: string, expected: ReadonlyArray<TreeEntry>): Effect.Effect<boolean, Failure> =>
    withSentinel(
      path,
      () => Effect.void,
      (sentinel) =>
        captureTree(sentinel).pipe(Effect.map((tree) => treesEqual(relocated(tree, sentinel, path), expected))),
      (target, sentinel, identity) =>
        rollbackPrivateDirectory(target, identity).pipe(
          Effect.catch(() => Effect.succeed(false)),
          Effect.flatMap((removed) =>
            removed ? removeDetached(sentinel).pipe(Effect.as(true)) : Effect.succeed(false),
          ),
        ),
    )
  const metadataMutation = (
    operation: "replacePrivateDirectory" | "removePrivateDirectory",
    directoryPath: string,
    metadataPath: string,
    expected: Uint8Array,
    replacement?: Uint8Array,
  ): Effect.Effect<boolean, Failure> => {
    if (dirname(metadataPath) !== directoryPath) return Effect.fail(failure(operation, "InvalidMetadataPath"))
    const metadataName = basename(metadataPath)
    const prepare = (sentinel: string): Effect.Effect<void, Failure> =>
      replacement === undefined
        ? Effect.void
        : createExclusive(join(sentinel, metadataName), profile.modes.file).pipe(
            Effect.flatMap((file) =>
              file.writeAll(replacement).pipe(Effect.andThen(file.sync), Effect.andThen(file.close)),
            ),
          )
    return withSentinel(
      directoryPath,
      prepare,
      (sentinel) => readFile(join(sentinel, metadataName)).pipe(Effect.map((actual) => bytesEqual(actual, expected))),
      (target, sentinel) =>
        replacement === undefined
          ? removeDetached(target).pipe(Effect.andThen(removeDetached(sentinel)), Effect.as(true))
          : removeDetached(sentinel).pipe(Effect.as(true)),
    )
  }
  const replacePrivateDirectoryIfMetadataUnchanged = (
    directoryPath: string,
    metadataPath: string,
    expectedMetadata: Uint8Array,
    replacementMetadata: Uint8Array,
  ): Effect.Effect<boolean, Failure> =>
    metadataMutation("replacePrivateDirectory", directoryPath, metadataPath, expectedMetadata, replacementMetadata)
  const removePrivateDirectoryIfMetadataUnchanged = (
    directoryPath: string,
    metadataPath: string,
    expectedMetadata: Uint8Array,
  ): Effect.Effect<boolean, Failure> =>
    metadataMutation("removePrivateDirectory", directoryPath, metadataPath, expectedMetadata)
  return {
    capabilities: {
      privateAccessControl: true,
      noFollowPaths: true,
      noReplacePublish: true,
      fileSync: true,
      directorySync: true,
      atomicPrivateDirectory: true,
      compareMetadataDirectoryMutation: true,
      compareTreeDirectoryMutation: true,
    },
    inspect,
    readDirectory,
    readFile,
    createDirectory,
    createPrivateDirectory,
    createExclusive,
    publishNoReplace,
    openDirectory: openDurableDirectory,
    removeTree: (path) =>
      captureTree(path).pipe(
        Effect.andThen((expected) => removeTreeIfUnchanged(path, expected)),
        Effect.flatMap((removed) => (removed ? Effect.void : Effect.fail(failure("removeTree", "TreeChanged")))),
      ),
    captureTree,
    removeTreeIfUnchanged,
    replacePrivateDirectoryIfMetadataUnchanged,
    removePrivateDirectoryIfMetadataUnchanged,
  }
}

export const makeLive = (): DurableFileSystemService => makePosixDurableFileSystem(makePosixBindings())
