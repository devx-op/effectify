import { createHash } from "node:crypto"
import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Planner from "../src/planner.js"
import * as TodoGeneration from "../src/generators/index.js"
import * as TodoPreset from "../src/todo-preset.js"
import { migrateTodoV1Owners } from "../src/todo-v1.js"
import { TodoV1Fixture } from "./fixtures/todo-v1.js"
const intent = { capabilities: ["todo.events"], preset: "todo", version: "effectify.creation-intent/1" }
const expectedOutputs = TodoV1Fixture.map(([path, digest]) => [path, digest])
const expectedOwners = TodoV1Fixture.map(([path, _digest, _legacy, owner]) => [path, owner])
const digests = (files: ReadonlyArray<{ readonly content: string; readonly path: string }>) =>
  files
    .map((file) => [file.path, createHash("sha256").update(file.content).digest("hex")])
    .sort(([left], [right]) => left.localeCompare(right))
const defaultContext = () => structuredClone(TodoPreset.DefaultTodoRenderContext)
const withPackageName = (context: ReturnType<typeof defaultContext>, id: string, name: string) => ({
  ...context,
  packages: context.packages.map((target) => (target.id === id ? { ...target, name } : target)),
})
it.effect("freezes the exact eighteen Todo v1 bytes for public and direct atomic defaults", () =>
  Effect.gen(function* () {
    const plan = yield* Planner.planTodo(intent)
    const [publicTopology, direct] = yield* Effect.all([
      TodoPreset.createTodoTopology(plan),
      TodoGeneration.composeTodoAtomic(TodoPreset.DefaultTodoRenderContext),
    ])
    expect([Object.isFrozen(TodoV1Fixture), TodoV1Fixture.length]).toEqual([true, 18])
    expect(digests(publicTopology.files)).toEqual(expectedOutputs)
    expect(
      direct.contributions.map((file) => [file.path, createHash("sha256").update(file.bytes).digest("hex")]),
    ).toEqual(expectedOutputs)
    expect(direct.contributions.map(({ owner, path }) => [path, owner])).toEqual(expectedOwners)
  }),
)
it.effect("migrates only every exact legacy Todo owner to its canonical atomic or surface owner", () =>
  Effect.gen(function* () {
    const legacy = TodoV1Fixture.map(([path, _digest, owner]) => ({ owner, path }))
    const replaceFirstOwner = (owner: string) => [{ ...legacy[0], owner }, ...legacy.slice(1)]
    const migrated = yield* migrateTodoV1Owners(legacy)
    expect(migrated).toEqual(TodoV1Fixture.map(([path, _digest, _legacy, owner]) => ({ owner, path })))
    const hostile = [
      [legacy.slice(1), "missing-output"],
      [replaceFirstOwner("todo-model-spoof"), "unknown-owner"],
      [replaceFirstOwner("package-surface"), "ambiguous-owner"],
      [[...legacy, legacy[0]], "duplicate-path"],
      [replaceFirstOwner(legacy[1].owner), "mismatched-path"],
      [replaceFirstOwner(TodoV1Fixture[0][3]), "already-invalid-owner"],
    ] as const
    for (const [identities, reason] of hostile) {
      const failure = yield* migrateTodoV1Owners(identities).pipe(Effect.flip)
      expect(failure).toMatchObject({ _tag: "TodoV1OwnerMigrationError", reason })
    }
  }),
)
it.effect("uses Unit4 atomics for any context that differs from the complete Todo v1 default", () =>
  Effect.gen(function* () {
    const base = defaultContext()
    const renamedDomain = withPackageName(base, "domain", "@effectify/next-domain")
    const changedImport = {
      ...renamedDomain,
      domain: { ...renamedDomain.domain, importName: "@effectify/next-domain" },
    }
    const changedEntity = { ...base, entity: { ...base.entity, id: "task" } }
    const changedDomain = { ...base, domain: { ...base.domain, id: "tasks" } }
    for (const context of [changedImport, changedDomain, changedEntity]) {
      const generic = yield* TodoGeneration.composeTodoAtomic(context)
      expect(generic.generatorIds).toContain("workspace-surface")
      expect(generic.generatorIds).not.toContain("todo-v1-workspace")
      expect(generic.contributions.map(({ owner, path }) => [path, owner])).not.toEqual(expectedOwners)
    }
    const parameterized = yield* TodoGeneration.composeTodoAtomic(changedImport)
    const packageManifest = parameterized.contributions.find(
      (file) => file.path === "packages/todo/domain/package.json",
    )
    expect(new TextDecoder().decode(packageManifest?.bytes)).toContain("@effectify/next-domain")
    const extraPackage = {
      ...base,
      packages: [...base.packages, { id: "extra", name: "@effectify/todo-extra", root: "packages/todo/extra" }],
    }
    const failure = yield* TodoGeneration.composeTodoAtomic(extraPackage).pipe(Effect.flip)
    expect(failure).toMatchObject({ _tag: "RenderFailure", generatorId: "todo-surface-input", reason: "unsafe-path" })
  }),
)
