import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"
import * as DurableFileSystem from "../src/durable-file-system.js"
import * as Ownership from "../src/ownership.js"
import * as WorkspaceLock from "../src/workspace-lock.js"
import * as WorkspaceMutator from "../src/workspace-mutator.js"
import { makeFakeDurableFileSystem } from "./durable-file-system-fake.js"

it.effect("runs a workspace-scoped mutation only for a matching live owner", () =>
  Effect.gen(function* () {
    const workspace = "/workspace"
    const fake = yield* makeFakeDurableFileSystem()
    const mutations = yield* Ref.make(0)
    const ownership = Ownership.issueForScope({
      workspace,
      lockPath: WorkspaceLock.workspaceLockPath(workspace),
    })
    const owned = yield* WorkspaceMutator.mutate(
      { workspace, ownership, relativePath: "generated/file.txt", fileSystem: fake.fileSystem },
      (target) =>
        Effect.sync(() => expect(target).toBe("/workspace/generated/file.txt")).pipe(
          Effect.andThen(Ref.update(mutations, (count) => count + 1)),
        ),
    )
    const foreign = Ownership.issueForScope({
      workspace: "/other-workspace",
      lockPath: WorkspaceLock.workspaceLockPath("/other-workspace"),
    })
    const rejected = yield* Effect.result(
      WorkspaceMutator.mutate(
        { workspace, ownership: foreign, relativePath: "generated/file.txt", fileSystem: fake.fileSystem },
        () => Ref.update(mutations, (count) => count + 1),
      ),
    )

    expect(owned).toBeUndefined()
    expect(rejected).toMatchObject({ _tag: "Failure", failure: { _tag: "OwnershipRejected" } })
    expect(yield* Ref.get(mutations)).toBe(1)
  }),
)

it.effect("rejects an existing symlink ancestor before the mutation callback", () =>
  Effect.gen(function* () {
    const workspace = "/workspace"
    const fake = yield* makeFakeDurableFileSystem()
    const callbacks = yield* Ref.make(0)
    const fileSystem: DurableFileSystem.DurableFileSystemService = {
      ...fake.fileSystem,
      inspect: (path) =>
        path === `${workspace}/generated`
          ? Effect.succeed({ type: "symlink", device: 1, mode: 0o700 })
          : fake.fileSystem.inspect(path),
    }
    const ownership = Ownership.issueForScope({ workspace, lockPath: WorkspaceLock.workspaceLockPath(workspace) })
    const result = yield* Effect.result(
      WorkspaceMutator.mutate({ workspace, ownership, relativePath: "generated/file.txt", fileSystem }, () =>
        Ref.update(callbacks, (count) => count + 1),
      ),
    )

    expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "WorkspaceMutationRejected" } })
    expect(yield* Ref.get(callbacks)).toBe(0)
  }),
)

it.effect("fails closed when ancestor inspection is indeterminate", () =>
  Effect.gen(function* () {
    const workspace = "/workspace"
    const fake = yield* makeFakeDurableFileSystem()
    const callbacks = yield* Ref.make(0)
    const fileSystem: DurableFileSystem.DurableFileSystemService = {
      ...fake.fileSystem,
      inspect: (path) =>
        path === `${workspace}/generated`
          ? Effect.fail(new DurableFileSystem.UnsupportedDurability({ capability: "noFollowPaths" }))
          : fake.fileSystem.inspect(path),
    }
    const ownership = Ownership.issueForScope({ workspace, lockPath: WorkspaceLock.workspaceLockPath(workspace) })
    const result = yield* Effect.result(
      WorkspaceMutator.mutate({ workspace, ownership, relativePath: "generated/file.txt", fileSystem }, () =>
        Ref.update(callbacks, (count) => count + 1),
      ),
    )

    expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "WorkspaceMutationRejected" } })
    expect(yield* Ref.get(callbacks)).toBe(0)
  }),
)
