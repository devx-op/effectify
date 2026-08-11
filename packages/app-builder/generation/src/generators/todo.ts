import { createHash } from "node:crypto"
import { relative } from "node:path/posix"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Kernel from "../kernel.js"
import type { PackageSurfaceInput } from "./surfaces.js"

const ids = ["model", "port", "event", "use-case", "integration-adapter", "presentation"] as const
export { ids as TodoGenerationBlockIds }
export type TodoGenerationBlockId = (typeof ids)[number]

const TodoPackageIds = ["domain", "application", "infrastructure", "presentation"] as const

interface TodoGeneratorDefinition {
  readonly files: ReadonlyArray<Readonly<{ content: string; relativePath: string }>>
  readonly id: TodoGenerationBlockId
  readonly packageId: string
  readonly provides: ReadonlyArray<string>
  readonly requires: ReadonlyArray<string>
}

const digest = (content: string) => Kernel.sourceDigest(`sha256:${createHash("sha256").update(content).digest("hex")}`)
const contextualizeImports = (content: string, context: Kernel.RenderContext, from: Kernel.PackageTarget) =>
  ["domain", "application", "infrastructure"].reduce((output, id) => {
    const target = context.packages.find((candidate) => candidate.id === id)
    if (target === undefined) return output
    const specifier = relative(`${from.root}/src`, `${target.root}/src/index.js`).replace(/^(?!\.)/, "./")
    return output
      .replaceAll(`../../${id}/src/index.js`, specifier)
      .replaceAll(`../../../packages/todo/${id}/src/index.js`, specifier)
  }, content)

export const todoContribution = (options: {
  readonly content: string
  readonly owner: string
  readonly path: string
  readonly surface: string
  readonly target: Kernel.PackageTarget
}): Kernel.FileContribution =>
  Object.freeze({
    bytes: new TextEncoder().encode(options.content),
    mode: "100644",
    owner: Kernel.identifier(options.owner),
    package: options.target.id,
    path: Kernel.safeRelativePath(options.path),
    sourceDigest: digest(options.content),
    surface: Kernel.identifier(options.surface),
  })

export const defineTodoGenerator = (definition: TodoGeneratorDefinition): Kernel.AtomicGenerator<unknown> => ({
  InputSchema: Schema.Unknown,
  id: Kernel.identifier(`todo-${definition.id}`),
  provides: Kernel.capabilities(...definition.provides),
  render: (_input, context): Effect.Effect<ReadonlyArray<Kernel.FileContribution>, Kernel.GenerationFailure> => {
    const target = context.packages.find((candidate) => candidate.id === definition.packageId)
    if (target === undefined) {
      return Effect.fail(new Kernel.RenderFailure({ generatorId: `todo-${definition.id}`, reason: "unsafe-path" }))
    }
    return Effect.succeed(
      Object.freeze(
        definition.files.map((file) =>
          todoContribution({
            content: contextualizeImports(file.content, context, target),
            owner: `todo-${definition.id}-${file.relativePath.replace(/[^a-z0-9]+/g, "-")}`,
            path: `${target.root}/${file.relativePath}`,
            surface: "todo-capability",
            target,
          }),
        ),
      ),
    )
  },
  requires: Kernel.capabilities(...definition.requires),
  version: "1",
})

const selectedWithPrerequisites = (selected: ReadonlyArray<TodoGenerationBlockId>) => {
  const dependencies: Readonly<Record<TodoGenerationBlockId, ReadonlyArray<TodoGenerationBlockId>>> = {
    model: [],
    event: ["model"],
    port: ["event"],
    "use-case": ["port"],
    "integration-adapter": ["use-case"],
    presentation: ["integration-adapter"],
  }
  const included = new Set<TodoGenerationBlockId>()
  const include = (id: TodoGenerationBlockId): void => {
    if (included.has(id)) return
    dependencies[id].forEach(include)
    included.add(id)
  }
  selected.forEach(include)
  return included
}

const modelExports =
  "TodoId Todo TodoTextInvalid TodoNotFound TodoAlreadyCompleted TodoIdExhausted TodoPersistenceError".split(" ")
const exportsFor = (included: ReadonlySet<TodoGenerationBlockId>) => ({
  domain: [...(included.has("model") ? modelExports : []), ...(included.has("event") ? ["TodoEvent"] : [])],
  application: [
    ...(included.has("port") ? ["TodoRepository", "TodoClock", "TodoIdGenerator", "TodoEvents"] : []),
    ...(included.has("use-case") ? ["TodoApplication", "layer"] : []),
  ],
  infrastructure: included.has("integration-adapter") ? ["TodoTestProbe", "testLayer", "liveLayer"] : [],
  presentation: included.has("presentation") ? ["createTestRuntime", "createLiveRuntime", "renderEvent"] : [],
})

export const todoSurfaceInput = (
  context: Kernel.RenderContext,
  selected: ReadonlyArray<TodoGenerationBlockId>,
): Effect.Effect<PackageSurfaceInput, Kernel.RenderFailure> => {
  if (
    context.packages.length !== TodoPackageIds.length ||
    !TodoPackageIds.every((id) => context.packages.some((target) => target.id === id))
  ) {
    return Effect.fail(new Kernel.RenderFailure({ generatorId: "todo-surface-input", reason: "unsafe-path" }))
  }
  const exports = exportsFor(selectedWithPrerequisites(selected))
  const dependencies = {
    application: exports.application.length > 0 ? ["domain"] : [],
    domain: [],
    infrastructure: exports.infrastructure.length > 0 ? ["application", "domain"] : [],
    presentation: exports.presentation.length > 0 ? ["infrastructure", "application", "domain"] : [],
  }
  return Effect.succeed({
    packages: TodoPackageIds.map((packageId) => ({
      dependencies: dependencies[packageId],
      exports: exports[packageId].map((name) => ({
        from: `./${packageId === "domain" ? (name === "TodoEvent" ? "event" : "model") : packageId === "application" ? (["TodoRepository", "TodoClock", "TodoIdGenerator", "TodoEvents"].includes(name) ? "port" : "use-case") : packageId === "infrastructure" ? "adapter" : "presentation"}.js`,
        name,
      })),
      packageId,
    })),
  })
}
