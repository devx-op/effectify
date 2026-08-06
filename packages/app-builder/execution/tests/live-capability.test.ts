import { lstat, mkdtemp, realpath, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as DurableFileSystem from "../src/durable-file-system.js"

it("prepares a private durable run hierarchy through the live no-follow adapter", async () => {
  const createdWorkspace = await mkdtemp(join(tmpdir(), "effectify-run-store-"))
  const workspace = await realpath(createdWorkspace)
  try {
    const fileSystem = DurableFileSystem.makeLive()
    const capability = await Effect.runPromise(Effect.result(DurableFileSystem.requireCapabilities(fileSystem)))
    const journal = await Effect.runPromise(
      DurableFileSystem.prepareRunJournalDirectory(fileSystem, workspace, "run:live-capability"),
    )
    const metadata = await lstat(join(workspace, ".effectify"))

    expect(capability).toMatchObject({ _tag: "Success" })
    expect(journal.journalDirectory.absolute).toContain("/journal")
    expect(metadata.mode & 0o077).toBe(0)
  } finally {
    await rm(createdWorkspace, { force: true, recursive: true })
  }
})
