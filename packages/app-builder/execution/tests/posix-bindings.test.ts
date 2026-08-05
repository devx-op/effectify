import { expect, it } from "@effect/vitest"
import { selectPosixAbiProfile } from "../src/internal/posix-abi.js"
import { posixFunctionDeclarations } from "../src/internal/posix-bindings.js"

it("keeps Darwin x64 ABI symbols separate from Koffi type declarations", () => {
  const profile = selectPosixAbiProfile({ platform: "darwin", arch: "x64" })
  const declarations = posixFunctionDeclarations(profile, "EffectifyStat")

  expect(declarations.fstat).toEqual({
    symbol: "fstat$INODE64",
    result: "int",
    parameters: ["int", "_Out_ EffectifyStat *"],
  })
  expect(declarations.fstatat.symbol).toBe("fstatat$INODE64")
  expect(declarations.fdopendir.symbol).toBe("fdopendir$INODE64")
  expect(declarations.readdir.symbol).toBe("readdir$INODE64")

  for (const declaration of Object.values(declarations)) {
    expect(declaration.result).not.toContain("$")
    expect(declaration.parameters).not.toContain(expect.stringContaining("$"))
  }
})
