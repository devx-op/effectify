import { expect, it } from "@effect/vitest"
import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import * as koffi from "koffi"
import * as Effect from "effect/Effect"
import * as DurableFileSystem from "../src/durable-file-system.js"
import { runtimeFromProcess, selectPosixAbiProfile } from "../src/internal/posix-abi.js"

const members = (profile: ReturnType<typeof selectPosixAbiProfile>): Record<string, koffi.TypeObject | string> => {
  const fields: Record<string, koffi.TypeObject | string> = {}
  let offset = 0
  for (const field of profile.dirent.fields) {
    if (field.offset > offset) fields[`padding${offset}`] = koffi.array("uint8_t", field.offset - offset)
    fields[field.name] = field.length === undefined ? field.type : koffi.array(field.type, field.length)
    offset =
      field.offset + (field.length === undefined ? koffi.sizeof(field.type) : koffi.sizeof(field.type) * field.length)
  }
  if (offset < profile.dirent.size) fields[`padding${offset}`] = koffi.array("uint8_t", profile.dirent.size - offset)
  return fields
}

const nameOf = (value: unknown): string => {
  if (typeof value === "string") return value
  if (!Buffer.isBuffer(value)) return ""
  const text = value.toString("utf8")
  const terminator = text.indexOf("\0")
  return terminator === -1 ? text : text.slice(0, terminator)
}

it("decodes the raw Koffi readdir BigInt pointer before exposing durable directory entries", async () => {
  const created = await mkdtemp(join(tmpdir(), "effectify-readdir-"))
  const workspace = await realpath(created)
  const entry = "journal-entry.json"
  await writeFile(join(workspace, entry), "evidence\n")
  const profile = selectPosixAbiProfile(runtimeFromProcess())
  const library = koffi.load(profile.library)
  const direntType = koffi.struct("EffectifyReaddirRegression", members(profile))
  const openDirectory = library.func("void *opendir(const char *)")
  const readdir = library.func(`void *${profile.symbols.readdir}(void *)`)
  const closeDirectory = library.func(`int ${profile.symbols.closedir}(void *)`)
  const directory = openDirectory(workspace)

  try {
    let decodedNames: ReadonlyArray<string> = []
    while (true) {
      const pointer = readdir(directory)
      if (pointer === null || pointer === undefined) break
      expect(typeof pointer).toBe("bigint")
      const decoded = koffi.decode(pointer, direntType)
      if (typeof decoded !== "object" || decoded === null) continue
      decodedNames = [...decodedNames, nameOf(Reflect.get(decoded, "name"))]
    }

    expect(decodedNames).toContain(entry)
    const entries = await Effect.runPromise(DurableFileSystem.makeLive().readDirectory(workspace))
    expect(entries).toContain(entry)
  } finally {
    closeDirectory(directory)
    await rm(created, { force: true, recursive: true })
  }
})
