import * as koffi from "koffi"
import { runtimeFromProcess, selectPosixAbiProfile, type PosixAbiProfile } from "./posix-abi.js"

export interface PosixStat {
  readonly device: number
  readonly inode: number
  readonly mode: number
  readonly size: number
}

export interface PosixDirectoryEntry {
  readonly name: string
  readonly type: number
}

export interface PosixBindings {
  readonly profile: PosixAbiProfile
  readonly openAt: (directory: number, path: string, flags: number, mode?: number) => number
  readonly fstat: (fileDescriptor: number) => readonly [number, PosixStat | undefined]
  readonly fstatAt: (directory: number, path: string, flags: number) => readonly [number, PosixStat | undefined]
  readonly mkdirAt: (directory: number, path: string, mode: number) => number
  readonly read: (fileDescriptor: number, length: number) => readonly [number, Uint8Array]
  readonly write: (fileDescriptor: number, bytes: Uint8Array) => number
  readonly fsync: (fileDescriptor: number) => number
  readonly fullSync: (fileDescriptor: number) => number
  readonly fchmod: (fileDescriptor: number, mode: number) => number
  readonly dup: (fileDescriptor: number) => number
  readonly fdopendir: (fileDescriptor: number) => unknown | undefined
  readonly readdir: (directory: unknown) => PosixDirectoryEntry | undefined
  readonly closedir: (directory: unknown) => number
  readonly unlinkAt: (directory: number, path: string, flags: number) => number
  readonly flock: (fileDescriptor: number, operation: number) => number
  readonly close: (fileDescriptor: number) => number
  readonly rename: (fromDirectory: number, from: string, toDirectory: number, to: string, flags: number) => number
  readonly errno: () => number
  readonly clearErrno: () => void
}

type NativeRecord = Record<string, unknown>

const isRecord = (value: unknown): value is NativeRecord => typeof value === "object" && value !== null
const numberOf = (value: unknown): number =>
  typeof value === "number" ? value : typeof value === "bigint" ? Number(value) : Number.NaN
const stringOf = (value: unknown): string => {
  if (typeof value === "string") return value
  if (!Buffer.isBuffer(value)) return ""
  const decoded = value.toString("utf8")
  const terminator = decoded.indexOf("\0")
  return terminator === -1 ? decoded : decoded.slice(0, terminator)
}

const members = (
  layout: PosixAbiProfile["stat"] | PosixAbiProfile["dirent"],
): Record<string, koffi.TypeObject | string> => {
  const fields: Record<string, koffi.TypeObject | string> = {}
  let offset = 0
  for (const field of layout.fields) {
    if (field.offset > offset) fields[`padding${offset}`] = koffi.array("uint8_t", field.offset - offset)
    fields[field.name] =
      field.length === undefined
        ? field.type
        : field.name === "qspare" || field.name === "reserved"
          ? koffi.array("uint8_t", koffi.sizeof(field.type) * field.length)
          : koffi.array(field.type, field.length)
    const width = field.length === undefined ? koffi.sizeof(field.type) : koffi.sizeof(field.type) * field.length
    offset = field.offset + width
  }
  if (offset < layout.size) fields[`padding${offset}`] = koffi.array("uint8_t", layout.size - offset)
  return fields
}

const assertLayout = (type: koffi.TypeObject, layout: PosixAbiProfile["stat"] | PosixAbiProfile["dirent"]): void => {
  if (koffi.sizeof(type) !== layout.size)
    throw new Error(`Unexpected Koffi layout size: ${koffi.sizeof(type)} != ${layout.size}`)
  for (const field of layout.fields) {
    if (koffi.offsetof(type, field.name) !== field.offset) throw new Error(`Unexpected Koffi offset for ${field.name}`)
  }
}

const statOf = (value: unknown): PosixStat | undefined => {
  if (!isRecord(value)) return undefined
  const device = numberOf(value.dev)
  const inode = numberOf(value.ino)
  const mode = numberOf(value.mode)
  const size = numberOf(value.size)
  return [device, inode, mode, size].every(Number.isFinite) ? { device, inode, mode, size } : undefined
}

let typeCounter = 0

const bind = (profile: PosixAbiProfile): PosixBindings => {
  const library = koffi.load(profile.library)
  const typeId = ++typeCounter
  const statName = `EffectifyStat${typeId}`
  const direntName = `EffectifyDirent${typeId}`
  const statType = koffi.struct(statName, members(profile.stat))
  const direntType = koffi.struct(direntName, members(profile.dirent))
  assertLayout(statType, profile.stat)
  assertLayout(direntType, profile.dirent)

  const openat = library.func(`int ${profile.symbols.openat}(int, const char *, int, ...)`)
  const fstat = library.func(`int ${profile.symbols.fstat}(int, _Out_ ${statName} *)`)
  const fstatat = library.func(`int ${profile.symbols.fstatat}(int, const char *, _Out_ ${statName} *, int)`)
  const mkdirat = library.func(`int mkdirat(int, const char *, ${profile.modeType})`)
  const read = library.func("int64_t read(int, _Out_ uint8_t *, uint64_t)")
  const write = library.func("int64_t write(int, const uint8_t *, uint64_t)")
  const fsync = library.func("int fsync(int)")
  const fcntl = library.func("int fcntl(int, int)")
  const fchmod = library.func(`int fchmod(int, ${profile.modeType})`)
  const dup = library.func("int dup(int)")
  const fdopendir = library.func(`void *${profile.symbols.fdopendir}(int)`)
  const readdir = library.func(`void *${profile.symbols.readdir}(void *)`)
  const closedir = library.func(`int ${profile.symbols.closedir}(void *)`)
  const unlinkat = library.func("int unlinkat(int, const char *, int)")
  const flock = library.func("int flock(int, int)")
  const close = library.func("int close(int)")
  const rename = library.func(`int ${profile.symbols.rename}(int, const char *, int, const char *, uint32_t)`)

  const callStat = (call: () => unknown, value: NativeRecord): readonly [number, PosixStat | undefined] => {
    const result = numberOf(call())
    return result === 0 ? [result, statOf(value)] : [result, undefined]
  }
  return {
    profile,
    openAt: (directory, path, flags, mode) =>
      mode === undefined
        ? numberOf(openat(directory, path, flags))
        : numberOf(openat(directory, path, flags, profile.varargs.openat, mode)),
    fstat: (fileDescriptor) => {
      const value: NativeRecord = {}
      return callStat(() => fstat(fileDescriptor, value), value)
    },
    fstatAt: (directory, path, flags) => {
      const value: NativeRecord = {}
      return callStat(() => fstatat(directory, path, value, flags), value)
    },
    mkdirAt: (directory, path, mode) => numberOf(mkdirat(directory, path, mode)),
    read: (fileDescriptor, length) => {
      const bytes = Buffer.allocUnsafe(length)
      const count = numberOf(read(fileDescriptor, bytes, length))
      return [count, count > 0 ? Uint8Array.from(bytes.subarray(0, count)) : new Uint8Array()]
    },
    write: (fileDescriptor, bytes) => numberOf(write(fileDescriptor, bytes, bytes.length)),
    fsync: (fileDescriptor) => numberOf(fsync(fileDescriptor)),
    fullSync: (fileDescriptor) =>
      profile.flags.fullSync === undefined ? -1 : numberOf(fcntl(fileDescriptor, profile.flags.fullSync)),
    fchmod: (fileDescriptor, mode) => numberOf(fchmod(fileDescriptor, mode)),
    dup: (fileDescriptor) => numberOf(dup(fileDescriptor)),
    fdopendir: (fileDescriptor) => {
      const result = fdopendir(fileDescriptor)
      return result === null || result === undefined ? undefined : result
    },
    readdir: (directory) => {
      const pointer = readdir(directory)
      if (pointer === null || pointer === undefined) return undefined
      const value = koffi.decode(pointer, direntType)
      if (!isRecord(value)) return undefined
      const name = stringOf(value.name)
      const type = numberOf(value.type)
      return name === "" || !Number.isFinite(type) ? undefined : { name, type }
    },
    closedir: (directory) => numberOf(closedir(directory)),
    unlinkAt: (directory, path, flags) => numberOf(unlinkat(directory, path, flags)),
    flock: (fileDescriptor, operation) => numberOf(flock(fileDescriptor, operation)),
    close: (fileDescriptor) => numberOf(close(fileDescriptor)),
    rename: (fromDirectory, from, toDirectory, to, flags) =>
      numberOf(rename(fromDirectory, from, toDirectory, to, flags)),
    errno: koffi.errno,
    clearErrno: () => {
      koffi.errno(0)
    },
  }
}

export const makePosixBindings = (): PosixBindings => bind(selectPosixAbiProfile(runtimeFromProcess()))
