import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"
import * as Ownership from "../src/ownership.js"
import * as WorkspaceLock from "../src/workspace-lock.js"
import * as WorkspaceMutator from "../src/workspace-mutator.js"

it.effect("runs a workspace-scoped mutation only for a matching live owner", () =>
  Effect.gen(function* () {
    const workspace = "/workspace"
    const mutations = yield* Ref.make(0)
    const ownership = Ownership.issueForScope({
      workspace,
      lockPath: WorkspaceLock.workspaceLockPath(workspace),
    })
    const owned = yield* WorkspaceMutator.mutate(
      { workspace, ownership, relativePath: "generated/file.txt" },
      Ref.update(mutations, (count) => count + 1),
    )
    const foreign = Ownership.issueForScope({
      workspace: "/other-workspace",
      lockPath: WorkspaceLock.workspaceLockPath("/other-workspace"),
    })
    const rejected = yield* Effect.result(
      WorkspaceMutator.mutate(
        { workspace, ownership: foreign, relativePath: "generated/file.txt" },
        Ref.update(mutations, (count) => count + 1),
      ),
    )

    expect(owned).toBeUndefined()
    expect(rejected).toMatchObject({ _tag: "Failure", failure: { _tag: "OwnershipRejected" } })
    expect(yield* Ref.get(mutations)).toBe(1)
  }),
)
