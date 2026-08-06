import { expect, it } from "@effect/vitest"
import { PosixAbiProfileError, selectPosixAbiProfile, type PosixRuntime } from "../src/internal/posix-abi.js"

const supportedRuntimes: ReadonlyArray<readonly [PosixRuntime, string, number, number, number]> = [
  [{ platform: "darwin", arch: "x64" }, "darwin-x64", 144, 1048, 0x200],
  [{ platform: "darwin", arch: "arm64" }, "darwin-arm64", 144, 1048, 0x200],
  [{ platform: "linux", arch: "x64", glibcVersionRuntime: "2.39" }, "linux-glibc-x64", 144, 280, 0x40],
  [{ platform: "linux", arch: "arm64", glibcVersionRuntime: "2.39" }, "linux-glibc-arm64", 128, 280, 0x40],
]

it("selects each supported LP64 profile with its exact ABI fixtures", () => {
  for (const [runtime, identifier, statSize, direntSize, createFlag] of supportedRuntimes) {
    const profile = selectPosixAbiProfile(runtime)

    expect(profile.identifier).toBe(identifier)
    expect(profile.cTypes).toEqual({ int: "int32_t", uint: "uint32_t", size: "uint64_t", ssize: "int64_t" })
    expect(profile.stat.size).toBe(statSize)
    expect(profile.dirent.size).toBe(direntSize)
    expect(profile.flags.open.create).toBe(createFlag)
    expect(profile.flags.open.noFollow).toBe(
      runtime.platform === "darwin" ? 0x100 : runtime.arch === "arm64" ? 0x8000 : 0x20000,
    )
    expect(profile.modes).toEqual({ file: 0o600, directory: 0o700 })
    expect(profile.symbols.openat).toBe("openat")
    expect(profile.varargs.openat).toBe(runtime.platform === "darwin" ? "int" : "uint32_t")
  }
})

it("encodes platform-specific symbols, offsets, rename flags, and errno aliases", () => {
  const darwin = selectPosixAbiProfile({ platform: "darwin", arch: "x64" })
  const linuxX64 = selectPosixAbiProfile({ platform: "linux", arch: "x64", glibcVersionRuntime: "2.39" })
  const linuxArm64 = selectPosixAbiProfile({ platform: "linux", arch: "arm64", glibcVersionRuntime: "2.39" })

  expect(darwin.symbols.fstat).toBe("fstat$INODE64")
  expect(darwin.stat.fields).toContainEqual({ name: "mode", offset: 4, type: "uint16_t" })
  expect(darwin.dirent.fields).toContainEqual({ name: "name", offset: 21, type: "char", length: 1024 })
  expect(darwin.flags.rename.noReplace).toBe(4)
  expect(darwin.flags.rename.exchange).toBe(2)
  expect(darwin.errno.notSupported).toBe(45)
  expect(darwin.errno.operationNotSupported).toBe(102)

  expect(linuxX64.stat.fields).toContainEqual({ name: "mode", offset: 24, type: "uint32_t" })
  expect(linuxArm64.stat.fields).toContainEqual({ name: "mode", offset: 16, type: "uint32_t" })
  expect(linuxX64.flags.open.directory).toBe(0x10000)
  expect(linuxX64.flags.open.noFollow).toBe(0x20000)
  expect(linuxArm64.flags.open.directory).toBe(0x4000)
  expect(linuxArm64.flags.open.noFollow).toBe(0x8000)
  expect(linuxX64.dirent.fields).toContainEqual({ name: "name", offset: 19, type: "char", length: 256 })
  expect(linuxX64.flags.rename.noReplace).toBe(1)
  expect(linuxX64.flags.rename.exchange).toBe(2)
  expect(linuxX64.errno.notSupported).toBe(95)
  expect(linuxX64.errno.operationNotSupported).toBe(95)
})

it("rejects unsupported operating system, architecture, and non-glibc Linux runtimes", () => {
  const unsupported: ReadonlyArray<PosixRuntime> = [
    { platform: "win32", arch: "x64" },
    { platform: "darwin", arch: "ia32" },
    { platform: "linux", arch: "x64" },
    { platform: "linux", arch: "x64", glibcVersionRuntime: undefined },
    { platform: "linux", arch: "s390x", glibcVersionRuntime: "2.39" },
  ]

  for (const runtime of unsupported) {
    expect(() => selectPosixAbiProfile(runtime)).toThrow(PosixAbiProfileError)
  }
})
