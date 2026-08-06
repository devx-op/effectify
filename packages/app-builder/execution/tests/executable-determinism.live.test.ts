import { expect, it } from "@effect/vitest"
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import * as Effect from "effect/Effect"
import * as DurableFileSystem from "../src/durable-file-system.js"
import { GeneratedPayload, run } from "../demo/operation.js"

it("produces byte-identical output and path-free stable reports in two clean workspaces", async () => {
  const first = await realpath(await mkdtemp(join(tmpdir(), "effectify-executable-first-")))
  const second = await realpath(await mkdtemp(join(tmpdir(), "effectify-executable-second-")))

  try {
    await Effect.runPromise(run({ workspace: first, approve: true, fileSystem: DurableFileSystem.makeLive() }))
    await Effect.runPromise(run({ workspace: second, approve: true, fileSystem: DurableFileSystem.makeLive() }))
    const [firstOutput, secondOutput, firstReport, secondReport] = await Promise.all([
      readFile(join(first, "generated.txt")),
      readFile(join(second, "generated.txt")),
      readFile(join(first, "success-report.txt"), "utf8"),
      readFile(join(second, "success-report.txt"), "utf8"),
    ])

    expect(firstOutput.equals(secondOutput)).toBe(true)
    expect(firstOutput.toString("utf8")).toBe(GeneratedPayload)
    expect(firstReport).toBe(secondReport)
    expect(firstReport).not.toContain(first)
    expect(secondReport).not.toContain(second)
  } finally {
    await Promise.all([rm(first, { force: true, recursive: true }), rm(second, { force: true, recursive: true })])
  }
})
