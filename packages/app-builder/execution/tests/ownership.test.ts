import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as DurableFileSystem from "../src/durable-file-system.js"
import * as Ownership from "../src/ownership.js"
import { makeFakeDurableFileSystem } from "./durable-file-system-fake.js"

const lockPath = "/workspace/.effectify/app-builder/v1/workspace.lock"

it.effect("keeps ownership unforgeable, workspace-bound, and inactive after scope invalidation", () =>
  Effect.sync(() => {
    const ownership = Ownership.issueForScope({ workspace: "/workspace", lockPath })

    expect(Ownership.isActiveFor(ownership, "/workspace", lockPath)).toBe(true)
    expect(Ownership.isActiveFor({}, "/workspace", lockPath)).toBe(false)
    expect(Ownership.isActiveFor(ownership, "/other-workspace", lockPath)).toBe(false)

    Ownership.invalidate(ownership)

    expect(Ownership.isActiveFor(ownership, "/workspace", lockPath)).toBe(false)
  }),
)

it.effect("admits exactly one 0700 lock-directory contender and leaves the loser without mutations", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const outcomes = yield* Effect.all(
      [fake.fileSystem.createPrivateDirectory(lockPath), fake.fileSystem.createPrivateDirectory(lockPath)].map(
        (effect) => Effect.result(effect),
      ),
      { concurrency: "unbounded" },
    )
    const winners = outcomes.filter(Result.isSuccess)
    const losers = outcomes.filter(Result.isFailure)
    const entry = yield* fake.fileSystem.inspect(lockPath)

    expect(winners).toHaveLength(1)
    expect(losers).toHaveLength(1)
    expect(entry).toEqual({ type: "directory", device: 1, mode: DurableFileSystem.PrivateDirectoryMode })
  }),
)

it.effect("refuses a metadata compare-and-remove when owner bytes change", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const expected = new TextEncoder().encode('{"owner":"first"}')
    const changed = new TextEncoder().encode('{"owner":"other"}')
    const metadataPath = `${lockPath}/owner.json`
    const directory = yield* fake.fileSystem.createPrivateDirectory(lockPath)
    const file = yield* fake.fileSystem.createExclusive(metadataPath, DurableFileSystem.PrivateFileMode)
    yield* file.writeAll(changed)
    yield* file.close
    yield* directory.close

    const removal = yield* fake.fileSystem.removePrivateDirectoryIfMetadataUnchanged(lockPath, metadataPath, expected)
    const entry = yield* fake.fileSystem.inspect(lockPath)

    expect(removal).toBe(false)
    expect(entry).toMatchObject({ type: "directory" })
  }),
)
