export interface PosixRuntime {
  readonly platform: string
  readonly arch: string
  readonly glibcVersionRuntime?: string
}

export interface AbiField {
  readonly name: string
  readonly offset: number
  readonly type: string
  readonly length?: number
}

export interface AbiLayout {
  readonly size: number
  readonly fields: ReadonlyArray<AbiField>
}

type Symbol = "openat" | "fstat" | "fstatat" | "fdopendir" | "readdir" | "closedir" | "rename"
type OpenFlags = Record<
  "readOnly" | "writeOnly" | "create" | "exclusive" | "directory" | "noFollow" | "closeOnExec",
  number
>
type Errno = Record<
  "interrupted" | "io" | "exists" | "noSystem" | "invalid" | "notSupported" | "operationNotSupported",
  number
>

export interface PosixAbiProfile {
  readonly identifier: "darwin-x64" | "darwin-arm64" | "linux-glibc-x64" | "linux-glibc-arm64"
  readonly platform: "darwin" | "linux"
  readonly library: string
  readonly cTypes: {
    readonly int: "int32_t"
    readonly uint: "uint32_t"
    readonly size: "uint64_t"
    readonly ssize: "int64_t"
  }
  readonly modeType: "uint16_t" | "uint32_t"
  readonly stat: AbiLayout
  readonly dirent: AbiLayout
  readonly symbols: Record<Symbol, string>
  readonly varargs: { readonly openat: "int" | "uint32_t" }
  readonly flags: {
    readonly atFdcwd: number
    readonly open: OpenFlags
    readonly at: Record<"noFollow" | "removeDirectory", number>
    readonly rename: Record<"noReplace" | "exchange", number>
    readonly fullSync?: number
  }
  readonly modes: { readonly file: number; readonly directory: number }
  readonly fileTypes: {
    readonly mask: number
    readonly file: number
    readonly directory: number
    readonly symlink: number
  }
  readonly errno: Errno
}

export class PosixAbiProfileError extends Error {
  readonly _tag = "PosixAbiProfileError"
  constructor(readonly runtime: PosixRuntime) {
    super(`Unsupported POSIX ABI profile: ${runtime.platform}/${runtime.arch}`)
  }
}

/** `name:type:offset[:array-length]`; the compact tables retain every native offset and width. */
const layout = (size: number, fields: string): AbiLayout => ({
  size,
  fields: fields.split(" ").map((field) => {
    const [name, type, offset, length] = field.split(":")
    if (name === undefined || type === undefined || offset === undefined) throw new Error(`Invalid ABI field: ${field}`)
    return { name, type, offset: Number(offset), ...(length === undefined ? {} : { length: Number(length) }) }
  }),
})

const statDarwin = layout(
  144,
  "dev:int32_t:0 mode:uint16_t:4 nlink:uint16_t:6 ino:uint64_t:8 uid:uint32_t:16 gid:uint32_t:20 rdev:int32_t:24 atimeSec:int64_t:32 atimeNsec:int64_t:40 mtimeSec:int64_t:48 mtimeNsec:int64_t:56 ctimeSec:int64_t:64 ctimeNsec:int64_t:72 birthtimeSec:int64_t:80 birthtimeNsec:int64_t:88 size:int64_t:96 blocks:int64_t:104 blockSize:int32_t:112 flags:uint32_t:116 gen:uint32_t:120 lspare:int32_t:124 qspare:int64_t:128:2",
)
const statLinuxX64 = layout(
  144,
  "dev:uint64_t:0 ino:uint64_t:8 nlink:uint64_t:16 mode:uint32_t:24 uid:uint32_t:28 gid:uint32_t:32 rdev:uint64_t:40 size:int64_t:48 blockSize:int64_t:56 blocks:int64_t:64 atimeSec:int64_t:72 atimeNsec:int64_t:80 mtimeSec:int64_t:88 mtimeNsec:int64_t:96 ctimeSec:int64_t:104 ctimeNsec:int64_t:112 reserved:int64_t:120:3",
)
const statLinuxArm64 = layout(
  128,
  "dev:uint64_t:0 ino:uint64_t:8 mode:uint32_t:16 nlink:uint32_t:20 uid:uint32_t:24 gid:uint32_t:28 rdev:uint64_t:32 size:int64_t:48 blockSize:int32_t:56 blocks:int64_t:64 atimeSec:int64_t:72 atimeNsec:int64_t:80 mtimeSec:int64_t:88 mtimeNsec:int64_t:96 ctimeSec:int64_t:104 ctimeNsec:int64_t:112 reserved:int32_t:120:2",
)
const direntDarwin = layout(
  1048,
  "ino:uint64_t:0 seek:uint64_t:8 reclen:uint16_t:16 namlen:uint16_t:18 type:uint8_t:20 name:char:21:1024",
)
const direntLinux = layout(280, "ino:uint64_t:0 off:int64_t:8 reclen:uint16_t:16 type:uint8_t:18 name:char:19:256")

const common = {
  cTypes: { int: "int32_t", uint: "uint32_t", size: "uint64_t", ssize: "int64_t" } as const,
  modes: { file: 0o600, directory: 0o700 },
  fileTypes: { mask: 0o170000, file: 0o100000, directory: 0o40000, symlink: 0o120000 },
  errno: { interrupted: 4, io: 5, exists: 17, noSystem: 38, invalid: 22, notSupported: 95, operationNotSupported: 95 },
}

const darwinSymbols = (arch: "x64" | "arm64"): Record<Symbol, string> => {
  const suffix = arch === "x64" ? "$INODE64" : ""
  return {
    openat: "openat",
    fstat: `fstat${suffix}`,
    fstatat: `fstatat${suffix}`,
    fdopendir: `fdopendir${suffix}`,
    readdir: `readdir${suffix}`,
    closedir: "closedir",
    rename: "renameatx_np",
  }
}

const darwin = (arch: "x64" | "arm64"): PosixAbiProfile => ({
  ...common,
  identifier: arch === "x64" ? "darwin-x64" : "darwin-arm64",
  platform: "darwin",
  library: "/usr/lib/libSystem.B.dylib",
  modeType: "uint16_t",
  stat: statDarwin,
  dirent: direntDarwin,
  symbols: darwinSymbols(arch),
  varargs: { openat: "int" },
  flags: {
    atFdcwd: -2,
    open: {
      readOnly: 0,
      writeOnly: 1,
      create: 0x200,
      exclusive: 0x800,
      directory: 0x100000,
      noFollow: 0x100,
      closeOnExec: 0x1000000,
    },
    at: { noFollow: 0x20, removeDirectory: 0x80 },
    rename: { noReplace: 4, exchange: 2 },
    fullSync: 51,
  },
  errno: { interrupted: 4, io: 5, exists: 17, noSystem: 78, invalid: 22, notSupported: 45, operationNotSupported: 102 },
})

const linux = (arch: "x64" | "arm64"): PosixAbiProfile => ({
  ...common,
  identifier: arch === "x64" ? "linux-glibc-x64" : "linux-glibc-arm64",
  platform: "linux",
  library: "libc.so.6",
  modeType: "uint32_t",
  stat: arch === "x64" ? statLinuxX64 : statLinuxArm64,
  dirent: direntLinux,
  symbols: {
    openat: "openat",
    fstat: "fstat",
    fstatat: "fstatat",
    fdopendir: "fdopendir",
    readdir: "readdir",
    closedir: "closedir",
    rename: "renameat2",
  },
  varargs: { openat: "uint32_t" },
  flags: {
    atFdcwd: -100,
    open: {
      readOnly: 0,
      writeOnly: 1,
      create: 0x40,
      exclusive: 0x80,
      directory: arch === "arm64" ? 0x4000 : 0x10000,
      noFollow: arch === "arm64" ? 0x8000 : 0x20000,
      closeOnExec: 0x80000,
    },
    at: { noFollow: 0x100, removeDirectory: 0x200 },
    rename: { noReplace: 1, exchange: 2 },
  },
})

export const selectPosixAbiProfile = (runtime: PosixRuntime): PosixAbiProfile => {
  if (runtime.platform === "darwin" && (runtime.arch === "x64" || runtime.arch === "arm64")) return darwin(runtime.arch)
  if (
    runtime.platform === "linux" &&
    runtime.glibcVersionRuntime !== undefined &&
    (runtime.arch === "x64" || runtime.arch === "arm64")
  )
    return linux(runtime.arch)
  throw new PosixAbiProfileError(runtime)
}

export const runtimeFromProcess = (): PosixRuntime => {
  const report = process.report?.getReport()
  const glibcVersionRuntime =
    typeof report === "object" &&
    report !== null &&
    "header" in report &&
    typeof report.header === "object" &&
    report.header !== null &&
    "glibcVersionRuntime" in report.header &&
    typeof report.header.glibcVersionRuntime === "string"
      ? report.header.glibcVersionRuntime
      : undefined
  return { platform: process.platform, arch: process.arch, glibcVersionRuntime }
}
