import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { GeneratedPayload, report, run } from "../demo/operation.js"
import { makeFakeDurableFileSystem } from "./durable-file-system-fake.js"

const workspace = "/workspace"

it.effect("renders stable LF evidence with all required revisions and digests", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const result = yield* run({ workspace, approve: true, fileSystem: fake.fileSystem })
    const rendered = report(result)

    expect(rendered).toContain("r1=Validated:")
    expect(rendered).toContain("r2=WaitingForApproval:")
    expect(rendered).toContain("r3=Ready:")
    expect(rendered).toContain("r4=Executing:")
    expect(rendered).toContain("terminal=r5:Succeeded:")
    expect(rendered).toContain(`generated=${result.outputDigest}`)
    expect(rendered).toContain(GeneratedPayload.trim())
    expect(rendered).not.toContain(workspace)
    expect(rendered.endsWith("\n")).toBe(true)
  }),
)

it.effect("fails no-replace output creation while preserving the existing generated file", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const existing = yield* fake.fileSystem.createExclusive(`${workspace}/generated.txt`, 0o600)
    yield* existing.writeAll(new TextEncoder().encode("existing\n"))
    yield* existing.close
    const result = yield* Effect.result(run({ workspace, approve: true, fileSystem: fake.fileSystem }))

    expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "ExecutableOperationFailure", stage: "output" } })
    expect(new TextDecoder().decode(fake.contents.get(`${workspace}/generated.txt`))).toBe("existing\n")
    expect(new TextDecoder().decode(fake.contents.get(`${workspace}/failure-report.txt`))).toContain("stage=output")
  }),
)
