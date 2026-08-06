import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as DurableFileSystem from "../src/durable-file-system.js"
import { makeFakeDurableFileSystem } from "./durable-file-system-fake.js"

it.effect("requires every durability proof and exposes the POSIX adapter as the live implementation", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const run = yield* DurableFileSystem.prepareRunJournalDirectory(fake.fileSystem, "/workspace", "run:coverage")
    const draft = yield* DurableFileSystem.prepareDraftDirectory(fake.fileSystem, "/workspace", "draft:coverage")
    yield* DurableFileSystem.requireLockCapabilities(fake.fileSystem)
    const live = DurableFileSystem.makeLive()

    expect(run.journalDirectory.absolute).toContain("/runs/")
    expect(draft.draftDirectory.absolute).toContain("/drafts/")
    expect(live.capabilities).toEqual({
      privateAccessControl: true,
      noFollowPaths: true,
      noReplacePublish: true,
      fileSync: true,
      directorySync: true,
      atomicPrivateDirectory: true,
      compareMetadataDirectoryMutation: true,
      compareTreeDirectoryMutation: true,
    })
    for (const capability of [
      "privateAccessControl",
      "noFollowPaths",
      "noReplacePublish",
      "fileSync",
      "directorySync",
    ] as const) {
      const result = yield* Effect.result(
        DurableFileSystem.requireCapabilities({
          ...fake.fileSystem,
          capabilities: { ...fake.fileSystem.capabilities, [capability]: false },
        }),
      )
      expect(result).toMatchObject({ _tag: "Failure", failure: { capability } })
    }
    for (const capability of [
      "atomicPrivateDirectory",
      "compareMetadataDirectoryMutation",
      "compareTreeDirectoryMutation",
    ] as const) {
      const result = yield* Effect.result(
        DurableFileSystem.requireLockCapabilities({
          ...fake.fileSystem,
          capabilities: { ...fake.fileSystem.capabilities, [capability]: false },
        }),
      )
      expect(result).toMatchObject({ _tag: "Failure", failure: { capability } })
    }
    const missing = {
      ...fake.fileSystem,
      inspect: (path: string) => (path === "/workspace" ? Effect.succeed(undefined) : fake.fileSystem.inspect(path)),
    }
    const afterCreate = {
      ...fake.fileSystem,
      inspect: (path: string) =>
        path === "/workspace/new" ? Effect.succeed(undefined) : fake.fileSystem.inspect(path),
    }
    const symlink = (yield* makeFakeDurableFileSystem({ workspaceEntry: { type: "symlink", device: 1, mode: 0o777 } }))
      .fileSystem
    const file = (yield* makeFakeDurableFileSystem({ workspaceEntry: { type: "file", device: 1, mode: 0o600 } }))
      .fileSystem
    const failures = [
      DurableFileSystem.prepareRunJournalDirectory(missing, "/workspace", "run:missing").pipe(Effect.asVoid),
      DurableFileSystem.prepareRunJournalDirectory(symlink, "/workspace", "run:symlink").pipe(Effect.asVoid),
      DurableFileSystem.prepareDraftDirectory(file, "/workspace", "draft:file").pipe(Effect.asVoid),
      DurableFileSystem.ensurePrivateDirectory(afterCreate, "/workspace/new", 1).pipe(Effect.asVoid),
    ]
    expect(failures).toHaveLength(4)
    for (const operation of failures) expect((yield* Effect.result(operation))._tag).toBe("Failure")
  }),
)
