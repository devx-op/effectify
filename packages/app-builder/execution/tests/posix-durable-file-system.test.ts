import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as DurableFileSystem from "../src/durable-file-system.js"
import {
  makePosixDurableFileSystem,
  type PosixBindings,
  type PosixDirectoryEntry,
  type PosixStat,
} from "../src/internal/posix-durable-file-system.js"
import { selectPosixAbiProfile } from "../src/internal/posix-abi.js"

interface FakeOptions {
  readonly profile?: "darwin" | "linux"
  readonly writes?: ReadonlyArray<number>
  readonly reads?: ReadonlyArray<readonly [number, Uint8Array]>
  readonly rename?: ReadonlyArray<number>
  readonly errno?: number
  readonly link?: boolean
  readonly temporaryPresent?: boolean
  readonly failSyncDescriptor?: number
}

const directory: PosixStat = { device: 1, inode: 1, mode: 0o40700, size: 0 }
const file: PosixStat = { device: 1, inode: 2, mode: 0o100600, size: 4 }

const makeFake = (options: FakeOptions = {}) => {
  const operations: Array<string> = []
  const writes = [...(options.writes ?? [4])]
  const reads = [...(options.reads ?? [])]
  const renames = [...(options.rename ?? [0])]
  let currentErrno = options.errno ?? 4
  const profile =
    options.profile === "darwin"
      ? selectPosixAbiProfile({ platform: "darwin", arch: "arm64" })
      : selectPosixAbiProfile({ platform: "linux", arch: "x64", glibcVersionRuntime: "2.39" })
  const bindings: PosixBindings = {
    profile,
    openAt: (_directory, path, flags, mode) => {
      operations.push(`open:${path}:${flags}:${mode ?? ""}`)
      return path === "link"
        ? -1
        : path === "temporary" || path === "temp" || path === "data" || path === "owner.json"
          ? 20
          : 10
    },
    fstat: (fd) => [0, fd === 20 ? file : directory],
    fstatAt: (_directory, path) => [
      0,
      path === "link" || options.link
        ? { ...directory, mode: 0o120777 }
        : path === "temp" && options.temporaryPresent !== false
          ? file
          : directory,
    ],
    mkdirAt: (_directory, path, mode) => (operations.push(`mkdir:${path}:${mode}`), 0),
    read: () => reads.shift() ?? [0, new Uint8Array()],
    write: (_fd, bytes) => (operations.push(`write:${bytes.length}`), writes.shift() ?? bytes.length),
    fsync: (fd) => (operations.push(`fsync:${fd}`), fd === options.failSyncDescriptor ? -1 : 0),
    fullSync: (fd) => (operations.push(`fullsync:${fd}`), 0),
    fchmod: (fd, mode) => (operations.push(`chmod:${fd}:${mode}`), 0),
    dup: (fd) => (operations.push(`dup:${fd}`), 11),
    fdopendir: (fd) => (operations.push(`fdopendir:${fd}`), { fd }),
    readdir: (): PosixDirectoryEntry | undefined => undefined,
    closedir: () => (operations.push("closedir"), 0),
    unlinkAt: (_directory, path) => (operations.push(`unlink:${path}`), 0),
    flock: (fd, operation) => (operations.push(`flock:${fd}:${operation}`), 0),
    close: (fd) => (operations.push(`close:${fd}`), 0),
    rename: (_fromDirectory, from, _toDirectory, to, flags) => (
      operations.push(`rename:${from}:${to}:${flags}`),
      renames.shift() ?? 0
    ),
    errno: () => currentErrno,
    clearErrno: () => {
      currentErrno = 0
      operations.push("clear-errno")
    },
  }
  return { operations, profile, fileSystem: makePosixDurableFileSystem(bindings) }
}

it.effect("creates a private no-follow file and completes partial EINTR writes", () =>
  Effect.gen(function* () {
    const fake = makeFake({ writes: [-1, 2, 2] })
    const handle = yield* fake.fileSystem.createExclusive("/workspace/temporary", DurableFileSystem.PrivateFileMode)
    yield* handle.writeAll(Uint8Array.of(1, 2, 3, 4))

    expect(fake.operations).toContain(
      `open:temporary:${fake.profile.flags.open.writeOnly | fake.profile.flags.open.create | fake.profile.flags.open.exclusive | fake.profile.flags.open.noFollow | fake.profile.flags.open.closeOnExec}:384`,
    )
    expect(fake.operations).toContain("chmod:20:384")
    expect(fake.operations.filter((operation) => operation.startsWith("write:"))).toEqual([
      "write:4",
      "write:4",
      "write:2",
    ])
  }),
)

it.effect("fails a zero-byte write before publication", () =>
  Effect.gen(function* () {
    const fake = makeFake({ writes: [0] })
    const handle = yield* fake.fileSystem.createExclusive("/workspace/temporary", DurableFileSystem.PrivateFileMode)
    const result = yield* Effect.result(handle.writeAll(Uint8Array.of(1)))

    expect(result).toMatchObject({ _tag: "Failure", failure: { operation: "write", code: "EIO" } })
    expect(fake.operations.some((operation) => operation.startsWith("rename:"))).toBe(false)
  }),
)

it.effect("retries an interrupted read and joins partial reads from a no-follow file descriptor", () =>
  Effect.gen(function* () {
    const fake = makeFake({
      reads: [
        [-1, new Uint8Array()],
        [2, Uint8Array.of(65, 66)],
        [1, Uint8Array.of(67)],
        [0, new Uint8Array()],
      ],
    })
    const bytes = yield* fake.fileSystem.readFile("/workspace/data")

    expect(new TextDecoder().decode(bytes)).toBe("ABC")
    expect(fake.operations.some((operation) => operation.startsWith("open:data:"))).toBe(true)
  }),
)

it.effect("fails closed before writing through a symlinked protected component", () =>
  Effect.gen(function* () {
    const fake = makeFake({ link: true })
    const result = yield* Effect.result(
      fake.fileSystem.createExclusive("/workspace/link/output", DurableFileSystem.PrivateFileMode),
    )

    expect(result).toMatchObject({ _tag: "Failure", failure: { operation: "openat" } })
    expect(fake.operations.some((operation) => operation.startsWith("write:"))).toBe(false)
  }),
)

it.effect("owns only a duplicated DIR descriptor and performs Darwin full synchronization", () =>
  Effect.gen(function* () {
    const fake = makeFake({ profile: "darwin" })
    const handle = yield* fake.fileSystem.createExclusive("/workspace/temporary", DurableFileSystem.PrivateFileMode)
    yield* handle.sync
    yield* handle.close
    const directoryHandle = yield* fake.fileSystem.openDirectory("/workspace")
    yield* directoryHandle.sync
    yield* directoryHandle.close

    expect(fake.operations).toContain("fsync:20")
    expect(fake.operations).toContain("fullsync:20")
    yield* fake.fileSystem.readDirectory("/workspace")
    expect(fake.operations).toContain("dup:10")
    expect(fake.operations).toContain("fdopendir:11")
    expect(fake.operations).toContain("closedir")
    expect(fake.operations.filter((operation) => operation === "close:11")).toHaveLength(0)
  }),
)

it.effect("reports parent durability indeterminate after publication without touching the destination", () =>
  Effect.gen(function* () {
    const fake = makeFake({ errno: 5, failSyncDescriptor: 10 })
    const file = yield* fake.fileSystem.createExclusive("/workspace/temp", DurableFileSystem.PrivateFileMode)
    yield* file.close
    const result = yield* Effect.result(fake.fileSystem.publishNoReplace("/workspace/temp", "/workspace/final"))

    expect(result).toMatchObject({ _tag: "Failure", failure: { operation: "parentSync", code: "EIO" } })
    expect(fake.operations.some((operation) => operation.startsWith("rename:temp:final:"))).toBe(true)
    expect(fake.operations).not.toContain("unlink:final")
  }),
)

it.effect(
  "preserves the destination and fails closed for existing, unsupported, and uncertain no-replace results",
  () =>
    Effect.gen(function* () {
      const existing = makeFake({ rename: [-1], errno: 17 })
      const unsupported = makeFake({ rename: [-1], errno: 38 })
      const uncertain = makeFake({ rename: [-1], errno: 5, temporaryPresent: false })

      for (const fake of [existing, unsupported, uncertain]) {
        yield* fake.fileSystem.createExclusive("/workspace/temp", DurableFileSystem.PrivateFileMode)
        const result = yield* Effect.result(fake.fileSystem.publishNoReplace("/workspace/temp", "/workspace/final"))
        expect(result).toMatchObject({ _tag: "Failure" })
        expect(fake.operations.some((operation) => operation === "unlink:final")).toBe(false)
      }
      expect(existing.operations).toContain("unlink:temp")
      expect(unsupported.operations).toContain("unlink:temp")
      expect(uncertain.operations).not.toContain("unlink:temp")
    }),
)

it.effect("exchanges an unchanged private tree into a sentinel before removing it", () =>
  Effect.gen(function* () {
    const fake = makeFake()
    const expected = yield* fake.fileSystem.captureTree("/workspace/lock")
    const removed = yield* fake.fileSystem.removeTreeIfUnchanged("/workspace/lock", expected)

    expect(removed).toBe(true)
    expect(fake.operations.some((operation) => operation.endsWith(`:${fake.profile.flags.rename.exchange}`))).toBe(true)
    expect(fake.operations.filter((operation) => operation.startsWith("unlink:"))).toHaveLength(2)
  }),
)

it.effect("swaps a sentinel back when detached tree comparison mismatches", () =>
  Effect.gen(function* () {
    const fake = makeFake()
    const restored = yield* fake.fileSystem.removeTreeIfUnchanged("/workspace/lock", [
      { path: "/workspace/lock", type: "file", bytes: Uint8Array.of(1) },
    ])

    expect(restored).toBe(false)
    expect(
      fake.operations.filter((operation) => operation.endsWith(`:${fake.profile.flags.rename.exchange}`)),
    ).toHaveLength(2)
    expect(fake.operations.some((operation) => operation === "unlink:lock")).toBe(false)
  }),
)

it.effect("restores the original tree when detached comparison fails", () =>
  Effect.gen(function* () {
    const fake = makeFake({ reads: [[-1, new Uint8Array()]], errno: 5 })
    const result = yield* Effect.result(
      fake.fileSystem.removePrivateDirectoryIfMetadataUnchanged(
        "/workspace/lock",
        "/workspace/lock/owner.json",
        Uint8Array.of(1),
      ),
    )
    const exchanges = fake.operations.filter((operation) =>
      operation.endsWith(`:${fake.profile.flags.rename.exchange}`),
    )
    const firstExchange = exchanges[0]?.match(/^rename:lock:(.+):2$/)
    const sentinelLeaf = firstExchange?.[1] ?? ""

    expect(result).toMatchObject({ _tag: "Failure", failure: { operation: "read", code: "EIO" } })
    expect(exchanges).toEqual([exchanges[0], `rename:${sentinelLeaf}:lock:2`])
    expect(fake.operations).toContain(`unlink:${sentinelLeaf}`)
    expect(fake.operations).not.toContain("unlink:lock")
  }),
)

it.effect("rolls back only the exact private directory instance and synchronizes its parent", () =>
  Effect.gen(function* () {
    const fake = makeFake()
    const directory = yield* fake.fileSystem.createPrivateDirectory("/workspace/private")
    const rolledBack = yield* directory.rollback

    expect(rolledBack).toBe(true)
    expect(fake.operations).toContain("unlink:private")
    expect(fake.operations).toContain("fsync:10")
  }),
)
