import { mkdtemp, realpath, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import * as Effect from "effect/Effect"
import * as DurableFileSystem from "../src/durable-file-system.js"

const run = async (): Promise<void> => {
  const createdWorkspace = await mkdtemp(join(tmpdir(), "effectify-posix-smoke-"))
  const workspace = await realpath(createdWorkspace)
  try {
    const fileSystem = DurableFileSystem.makeLive()
    const privateDirectory = join(workspace, "private")
    const temporary = join(privateDirectory, "temporary")
    const final = join(privateDirectory, "immutable")
    const directory = await Effect.runPromise(fileSystem.createPrivateDirectory(privateDirectory))
    await Effect.runPromise(directory.close)
    const file = await Effect.runPromise(fileSystem.createExclusive(temporary, DurableFileSystem.PrivateFileMode))
    await Effect.runPromise(file.writeAll(new TextEncoder().encode("posix-smoke\n")))
    await Effect.runPromise(file.sync)
    await Effect.runPromise(file.close)
    await Effect.runPromise(fileSystem.publishNoReplace(temporary, final))
    const bytes = await Effect.runPromise(fileSystem.readFile(final))
    if (new TextDecoder().decode(bytes) !== "posix-smoke\n") throw new Error("POSIX smoke payload mismatch")
  } finally {
    await rm(createdWorkspace, { force: true, recursive: true })
  }
}

try {
  await run()
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
