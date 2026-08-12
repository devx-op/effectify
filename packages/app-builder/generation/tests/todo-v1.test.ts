import { createHash } from "node:crypto"
import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Planner from "../src/planner.js"
import * as TodoGeneration from "../src/generators/index.js"
import * as TodoPreset from "../src/todo-preset.js"
import { TodoV1Fixture } from "./fixtures/todo-v1.js"
const intent = { capabilities: ["todo.events"], preset: "todo", version: "effectify.creation-intent/1" }
const expectedOutputs = TodoV1Fixture.map(([path, digest]) => [path, digest])
const expectedOwners = TodoV1Fixture.map(([path, _digest, _legacy, owner]) => [path, owner])
const digests = (files: ReadonlyArray<{ readonly content: string; readonly path: string }>) =>
  files
    .map((file) => [file.path, createHash("sha256").update(file.content).digest("hex")])
    .sort(([left], [right]) => left.localeCompare(right))
const customIntent = {
  ...intent,
  naming: {
    workspace: "operations-workspace",
    npmScope: "@acme",
    domain: { id: "operations", name: "Operations" },
    entity: { id: "task", singular: "Task", plural: "Tasks" },
    entrypoint: { id: "admin-console", name: "AdminConsole" },
  },
}
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
it.effect("renders independent names through the public intent, planner, and topology route", () =>
  Effect.gen(function* () {
    const topology = yield* TodoPreset.createTodoTopology(yield* Planner.planTodo(customIntent))
    expect(topology.roots).toEqual([
      "packages/operations/domain",
      "packages/operations/application",
      "packages/operations/infrastructure",
      "apps/admin-console",
    ])
    expect(topology.projects.map(({ name }) => name)).toEqual([
      "@acme/operations-domain",
      "@acme/operations-application",
      "@acme/operations-infrastructure",
      "@acme/admin-console",
    ])
    expect(topology.files.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        "packages/operations/domain/tests/task.test.ts",
        "packages/operations/infrastructure/tests/task-runtime.test.ts",
        "apps/admin-console/tests/task.test.ts",
      ]),
    )
    const source = topology.files.map(({ content }) => content).join("\n")
    expect(source).toContain("TaskApplication")
    expect(source).toContain("@acme/operations-domain")
    expect(source).not.toMatch(/Todo|Effectify|@effectify/)
  }),
)
