import * as Data from "effect/Data"
import * as Effect from "effect/Effect"

export type TodoV1OwnerIdentity = Readonly<{ owner: string; path: string }>
export class TodoV1OwnerMigrationError extends Data.TaggedError("TodoV1OwnerMigrationError")<{
  readonly path: string
  readonly reason:
    | "already-invalid-owner"
    | "ambiguous-owner"
    | "duplicate-path"
    | "mismatched-path"
    | "missing-output"
    | "unknown-owner"
}> {}

const roots = ["nx.json", "package.json", "pnpm-workspace.yaml", "tsconfig.build.json", "vitest.config.mts"]
const packages = [
  ["packages/todo/domain", "domain", "model"],
  ["packages/todo/application", "application", "port"],
  ["packages/todo/infrastructure", "infrastructure", "integration-adapter"],
  ["apps/todo-cli", "presentation", "presentation"],
] as const
const leaves: Readonly<Record<string, readonly [legacy: string, current: string]>> = {
  "packages/todo/application/src/use-case.ts": ["use-case", "todo-use-case-src-use-case-ts"],
  "packages/todo/domain/src/events.ts": ["event", "todo-event-src-events-ts"],
  "packages/todo/domain/tests/todo.test.ts": ["model", "todo-model-tests-todo-test-ts"],
  "packages/todo/infrastructure/tests/todo-runtime.test.ts": [
    "integration-adapter",
    "todo-integration-adapter-tests-todo-runtime-test-ts",
  ],
  "apps/todo-cli/tests/todo.test.ts": ["presentation", "todo-presentation-tests-todo-test-ts"],
}
const legacy = (owner: string) => `@effectify/app-builder/${owner}/1`
const expectedPaths = new Set([
  ...roots,
  ...packages.flatMap(([root]) => [`${root}/package.json`, `${root}/src/index.ts`]),
  ...Object.keys(leaves),
])
const expected = (path: string): readonly [legacy: string, current: string] | undefined => {
  if (roots.includes(path)) return [legacy("workspace"), `workspace-surface-${path.replace(/[^a-z0-9]+/g, "-")}`]
  const surface = packages.find(([root]) => path === `${root}/package.json` || path === `${root}/src/index.ts`)
  if (surface !== undefined)
    return [
      legacy(path.endsWith("package.json") ? "workspace" : surface[2]),
      `package-surface-${surface[1]}-${path.endsWith("package.json") ? "manifest" : "barrel"}`,
    ]
  const leaf = leaves[path]
  return leaf === undefined ? undefined : [legacy(leaf[0]), `todo-${leaf[0]}-${path.replace(/[^a-z0-9]+/g, "-")}`]
}
const currentOwners = new Set([...expectedPaths].flatMap((path) => expected(path)?.[1] ?? []))
const legacyOwners = new Set([...expectedPaths].flatMap((path) => expected(path)?.[0] ?? []))
const failure = (path: string, reason: TodoV1OwnerMigrationError["reason"]) =>
  Effect.fail(new TodoV1OwnerMigrationError({ path, reason }))

export const migrateTodoV1Owners = (
  identities: ReadonlyArray<TodoV1OwnerIdentity>,
): Effect.Effect<ReadonlyArray<TodoV1OwnerIdentity>, TodoV1OwnerMigrationError> =>
  Effect.gen(function* () {
    const paths = new Set<string>()
    const migrated: Array<TodoV1OwnerIdentity> = []
    for (const identity of identities) {
      if (paths.has(identity.path)) return yield* failure(identity.path, "duplicate-path")
      paths.add(identity.path)
      const owner = expected(identity.path)
      if (owner === undefined) return yield* failure(identity.path, "mismatched-path")
      if (currentOwners.has(identity.owner)) return yield* failure(identity.path, "already-invalid-owner")
      if (identity.owner === "package-surface") return yield* failure(identity.path, "ambiguous-owner")
      if (!legacyOwners.has(identity.owner)) return yield* failure(identity.path, "unknown-owner")
      if (identity.owner !== owner[0]) return yield* failure(identity.path, "mismatched-path")
      migrated.push(Object.freeze({ ...identity, owner: owner[1] }))
    }
    return paths.size === expectedPaths.size ? Object.freeze(migrated) : yield* failure("todo-v1", "missing-output")
  })
