import { randomUUID } from "node:crypto"
import { CanonicalJson, WizardDraft } from "@effectify/app-builder-contracts"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Result from "effect/Result"
import * as DurableFileSystem from "./durable-file-system.js"
import * as ManagedPath from "./managed-path.js"

export interface PersistDraftInput {
  readonly workspace: string
  readonly draft: unknown
}

export interface ReadDraftInput {
  readonly workspace: string
  readonly draftId: string
}

export type DraftStoreFailure = DurableFileSystem.DurableFailure | WizardDraft.WizardDraftFailure

export interface DraftStoreService {
  readonly persist: (
    input: PersistDraftInput,
  ) => Effect.Effect<WizardDraft.ValidatedWizardDraft, DraftStoreFailure, DurableFileSystem.Service>
  readonly read: (
    input: ReadDraftInput,
  ) => Effect.Effect<WizardDraft.ValidatedWizardDraft, DraftStoreFailure, DurableFileSystem.Service>
}

export class Service extends Context.Service<Service, DraftStoreService>()(
  "@effectify/app-builder-execution/DraftStore",
) {}

const fromResult = <Value, Failure>(result: Result.Result<Value, Failure>): Effect.Effect<Value, Failure> =>
  Result.match(result, { onFailure: Effect.fail, onSuccess: Effect.succeed })

const malformed = (): WizardDraft.MalformedWizardDraft => new WizardDraft.MalformedWizardDraft({ source: "shape" })

const canonicalDraft = (draft: unknown): Result.Result<CanonicalJson.CanonicalJson, WizardDraft.MalformedWizardDraft> =>
  CanonicalJson.canonicalizeJson(draft).pipe(Result.mapError(malformed))

const decodeCanonicalDraft = (
  text: string,
): Result.Result<WizardDraft.ValidatedWizardDraft, WizardDraft.WizardDraftFailure> => {
  try {
    const parsed: unknown = JSON.parse(text)
    return canonicalDraft(parsed).pipe(
      Result.flatMap((canonical) =>
        canonical.text === text ? WizardDraft.decodeValidatedWizardDraft(parsed) : Result.fail(malformed()),
      ),
    )
  } catch {
    return Result.fail(malformed())
  }
}

const writeTemporary = (
  fileSystem: DurableFileSystem.DurableFileSystemService,
  path: string,
  bytes: Uint8Array,
): Effect.Effect<void, DurableFileSystem.DurableFileSystemFailure | DurableFileSystem.UnsupportedDurability> =>
  Effect.acquireUseRelease(
    fileSystem.createExclusive(path, DurableFileSystem.PrivateFileMode),
    (file) => file.writeAll(bytes).pipe(Effect.andThen(file.sync)),
    (file) => file.close,
  )

const syncDirectory = (
  fileSystem: DurableFileSystem.DurableFileSystemService,
  path: string,
): Effect.Effect<void, DurableFileSystem.DurableFileSystemFailure | DurableFileSystem.UnsupportedDurability> =>
  Effect.acquireUseRelease(
    fileSystem.openDirectory(path),
    (directory) => directory.sync,
    (directory) => directory.close,
  )

const requireExistingDraftLayout = (
  fileSystem: DurableFileSystem.DurableFileSystemService,
  workspace: string,
  draftId: string,
): Effect.Effect<ManagedPath.DraftLayout, DurableFileSystem.DurableFailure> =>
  Effect.gen(function* () {
    yield* DurableFileSystem.requireCapabilities(fileSystem)
    const layout = yield* fromResult(ManagedPath.draftLayout(workspace, draftId))
    const workspaceEntry = yield* fileSystem.inspect(layout.workspace)
    if (workspaceEntry === undefined) {
      return yield* Effect.fail(
        new DurableFileSystem.DurableFileSystemFailure({ operation: "workspace", code: "ENOENT" }),
      )
    }
    for (const path of [
      `${layout.workspace}/.effectify`,
      `${layout.workspace}/.effectify/app-builder`,
      layout.root,
      `${layout.root}/drafts`,
      layout.draftDirectory.absolute,
    ]) {
      const entry = yield* fileSystem.inspect(path)
      if (entry === undefined) {
        return yield* Effect.fail(
          new DurableFileSystem.DurableFileSystemFailure({ operation: "inspect", code: "ENOENT" }),
        )
      }
      yield* fromResult(ManagedPath.assertPrivateDirectory(entry, workspaceEntry.device))
    }
    return layout
  })

const persistEffect = Effect.fn("AppBuilder.DraftStore.persist")(function* (input: PersistDraftInput) {
  const draft = yield* fromResult(WizardDraft.decodeValidatedWizardDraft(input.draft))
  const canonical = yield* fromResult(canonicalDraft(draft))
  const fileSystem = yield* DurableFileSystem.Service
  const layout = yield* DurableFileSystem.prepareDraftDirectory(fileSystem, input.workspace, draft.draftId)
  const temporary = `${layout.draft.absolute}.tmp-${randomUUID()}`
  yield* writeTemporary(fileSystem, temporary, CanonicalJson.canonicalJsonBytes(canonical))
  yield* fileSystem.publishNoReplace(temporary, layout.draft.absolute)
  yield* syncDirectory(fileSystem, layout.draftDirectory.absolute)
  return draft
})

const readEffect = Effect.fn("AppBuilder.DraftStore.read")(function* (input: ReadDraftInput) {
  const draftId = yield* fromResult(WizardDraft.decodeDraftId(input.draftId))
  const fileSystem = yield* DurableFileSystem.Service
  const layout = yield* requireExistingDraftLayout(fileSystem, input.workspace, draftId)
  const entry = yield* fileSystem.inspect(layout.draft.absolute)
  if (entry === undefined) {
    return yield* Effect.fail(new DurableFileSystem.DurableFileSystemFailure({ operation: "inspect", code: "ENOENT" }))
  }
  const workspace = yield* fileSystem.inspect(layout.workspace)
  if (workspace === undefined) {
    return yield* Effect.fail(
      new DurableFileSystem.DurableFileSystemFailure({ operation: "workspace", code: "ENOENT" }),
    )
  }
  yield* fromResult(ManagedPath.assertPrivateFile(entry, workspace.device))
  const bytes = yield* fileSystem.readFile(layout.draft.absolute)
  return yield* fromResult(decodeCanonicalDraft(new TextDecoder().decode(bytes)))
})

export const layer = Layer.succeed(Service, Service.of({ persist: persistEffect, read: readEffect }))

export const persist = (
  input: PersistDraftInput,
): Effect.Effect<WizardDraft.ValidatedWizardDraft, DraftStoreFailure, Service | DurableFileSystem.Service> =>
  Effect.flatMap(Service, (service) => service.persist(input))

export const read = (
  input: ReadDraftInput,
): Effect.Effect<WizardDraft.ValidatedWizardDraft, DraftStoreFailure, Service | DurableFileSystem.Service> =>
  Effect.flatMap(Service, (service) => service.read(input))
