import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as DurableFileSystem from "../src/durable-file-system.js"
import { makeFakeDurableFileSystem } from "./durable-file-system-fake.js"

it.effect("requires every durability proof and fails every live operation closed", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const run = yield* DurableFileSystem.prepareRunJournalDirectory(fake.fileSystem, "/workspace", "run:coverage")
    const draft = yield* DurableFileSystem.prepareDraftDirectory(fake.fileSystem, "/workspace", "draft:coverage")
    yield* DurableFileSystem.requireLockCapabilities(fake.fileSystem)
    const live = DurableFileSystem.makeLive()
    const blocked: ReadonlyArray<Effect.Effect<unknown, DurableFileSystem.DurableFailure>> = [
      live.inspect("/workspace"),
      live.readDirectory("/workspace"),
      live.readFile("/workspace/file"),
      live.createDirectory("/workspace/dir", 0o700),
      live.createPrivateDirectory("/workspace/private"),
      live.createExclusive("/workspace/file", 0o600),
      live.publishNoReplace("/workspace/a", "/workspace/b"),
      live.openDirectory("/workspace"),
      live.removeTree("/workspace/run"),
      live.captureTree("/workspace/run"),
      live.removeTreeIfUnchanged("/workspace/run", []),
      live.replacePrivateDirectoryIfMetadataUnchanged(
        "/workspace/lock",
        "/workspace/lock/owner",
        Uint8Array.of(1),
        Uint8Array.of(2),
      ),
      live.removePrivateDirectoryIfMetadataUnchanged("/workspace/lock", "/workspace/lock/owner", Uint8Array.of(1)),
    ]

    expect(run.journalDirectory.absolute).toContain("/runs/")
    expect(draft.draftDirectory.absolute).toContain("/drafts/")
    expect(blocked).toHaveLength(13)
    for (const operation of blocked) expect((yield* Effect.result(operation))._tag).toBe("Failure")
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
