import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"
import * as DraftStore from "../src/draft-store.js"
import * as DurableFileSystem from "../src/durable-file-system.js"
import { makeFakeDurableFileSystem } from "./durable-file-system-fake.js"

const version = { major: 1, minor: 0, patch: 0 }
const validDraft = () => ({
  draftId: "draft:durable-store",
  runRef: { id: "run:durable-store", version },
  protocolRef: { id: "protocol:durable-store", version },
  passivePlan: {
    planRef: { id: "plan:durable-store", version },
    steps: [
      {
        _tag: "ToolStep",
        stepKey: "prepare",
        toolRef: { id: "tool:durable-store", version },
        pinnedInputs: [
          {
            inputKey: "workspace",
            schemaRef: { id: "schema:durable-store", version },
            value: { branch: "main" },
          },
        ],
      },
    ],
  },
})

const withDraftStore =
  (fileSystem: DurableFileSystem.DurableFileSystemService) =>
  <Value, Error, Requirements>(effect: Effect.Effect<Value, Error, Requirements>) =>
    effect.pipe(Effect.provideService(DurableFileSystem.Service, fileSystem), Effect.provide(DraftStore.layer))

it.effect("persists and reads a contracts-validated passive draft through the durable managed path", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const stored = yield* DraftStore.persist({ workspace: "/workspace", draft: validDraft() }).pipe(
      withDraftStore(fake.fileSystem),
    )
    const restored = yield* DraftStore.read({ workspace: "/workspace", draftId: "draft:durable-store" }).pipe(
      withDraftStore(fake.fileSystem),
    )
    const operations = yield* Ref.get(fake.operations)

    expect(stored).toMatchObject({ draftId: "draft:durable-store", passivePlan: { steps: [{ stepKey: "prepare" }] } })
    expect(restored).toEqual(stored)
    expect(operations).toContainEqual(expect.stringMatching(/publish:.*\/drafts\/d1-.*\/draft\.json$/))
  }),
)

it.effect("rejects invalid draft material before creating managed directories or files", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const before = yield* Ref.get(fake.operations)
    const outcome = yield* Effect.result(
      DraftStore.persist({ workspace: "/workspace", draft: { ...validDraft(), draftId: "" } }).pipe(
        withDraftStore(fake.fileSystem),
      ),
    )
    const after = yield* Ref.get(fake.operations)

    expect(outcome).toMatchObject({ _tag: "Failure", failure: { _tag: "MalformedWizardDraft", source: "draft-id" } })
    expect(after).toEqual(before)
    expect(Array.from(fake.contents.keys())).toEqual([])
  }),
)

it.effect("retries publication with a fresh exclusive temporary draft and preserves the orphan", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    let failFirstPublication = true
    const fileSystem: DurableFileSystem.DurableFileSystemService = {
      ...fake.fileSystem,
      publishNoReplace: (temporaryPath, finalPath) => {
        if (failFirstPublication) {
          failFirstPublication = false
          return Effect.fail(
            new DurableFileSystem.DurableFileSystemFailure({ operation: "publish", code: "InjectedCrash" }),
          )
        }
        return fake.fileSystem.publishNoReplace(temporaryPath, finalPath)
      },
    }

    const first = yield* Effect.result(
      DraftStore.persist({ workspace: "/workspace", draft: validDraft() }).pipe(withDraftStore(fileSystem)),
    )
    const second = yield* DraftStore.persist({ workspace: "/workspace", draft: validDraft() }).pipe(
      withDraftStore(fileSystem),
    )
    const operations = yield* Ref.get(fake.operations)
    const temporaryPaths = operations
      .filter((operation) => operation.startsWith("create:") && operation.includes("/drafts/"))
      .map((operation) => operation.slice("create:".length))

    expect(first).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "DurableFileSystemFailure", operation: "publish" },
    })
    expect(second).toMatchObject({ draftId: "draft:durable-store" })
    expect(temporaryPaths).toHaveLength(2)
    expect(new Set(temporaryPaths)).toHaveLength(2)
    expect(fake.contents.has(temporaryPaths[0]!)).toBe(true)
    expect(fake.contents.has(temporaryPaths[1]!)).toBe(false)
    expect(operations.some((operation) => operation.startsWith("removeTree:"))).toBe(false)
  }),
)
