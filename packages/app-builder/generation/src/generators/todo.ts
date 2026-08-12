import { createHash } from "node:crypto"
import { relative } from "node:path/posix"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Kernel from "../kernel.js"
import type { PackageSurfaceInput } from "./surfaces.js"
import { renderTemplate, templateAsset, templateSubstitutions, type TemplateSubstitutions } from "../templates.js"

const ids = ["model", "port", "event", "use-case", "integration-adapter", "presentation"] as const
export { ids as TodoGenerationBlockIds }
export type TodoGenerationBlockId = (typeof ids)[number]

const TodoPackageIds = ["domain", "application", "infrastructure", "presentation"] as const

interface TodoGeneratorDefinition {
  readonly files: ReadonlyArray<Readonly<{ relativePath: string; sourcePath: string }>>
  readonly id: TodoGenerationBlockId
  readonly packageId: string
  readonly provides: ReadonlyArray<string>
  readonly requires: ReadonlyArray<string>
}

const digest = (content: string) => Kernel.sourceDigest(`sha256:${createHash("sha256").update(content).digest("hex")}`)
const importFrom = (context: Kernel.RenderContext, from: Kernel.PackageTarget, id: string): string => {
  const target = context.packages.find((candidate) => candidate.id === id)
  if (target === undefined) throw new Error(`Missing template package: ${id}`)
  return relative(`${from.root}/src`, `${target.root}/src/index.js`).replace(/^(?!\.)/, "./")
}

const substitutions = (context: Kernel.RenderContext, target: Kernel.PackageTarget): TemplateSubstitutions =>
  templateSubstitutions(context, {
    applicationImport: importFrom(context, target, "application"),
    domainImport: importFrom(context, target, "domain"),
    infrastructureImport: importFrom(context, target, "infrastructure"),
    targetRoot: target.root,
  })

export const todoContribution = (options: {
  readonly content: string
  readonly owner: string
  readonly path: string
  readonly surface: string
  readonly target: Kernel.PackageTarget
  readonly template?: Kernel.FileContribution["template"]
}): Kernel.FileContribution =>
  Object.freeze({
    bytes: new TextEncoder().encode(options.content),
    mode: "100644",
    owner: Kernel.identifier(options.owner),
    package: options.target.id,
    path: Kernel.safeRelativePath(options.path),
    sourceDigest: digest(options.content),
    surface: Kernel.identifier(options.surface),
    ...(options.template === undefined ? {} : { template: options.template }),
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
        definition.files.map((file) => {
          const template = templateAsset({
            directory: `generic/${definition.id}`,
            group: `todo-${definition.id}`,
            outputPath: `${target.root}/${file.relativePath}`,
            sourcePath: file.sourcePath,
            substitutions: substitutions(context, target),
          })
          return todoContribution({
            content: renderTemplate(template),
            owner: `todo-${definition.id}-${file.relativePath.replace(/[^a-z0-9]+/g, "-")}`,
            path: `${target.root}/${file.relativePath}`,
            surface: "todo-capability",
            target,
            template,
          })
        }),
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

const exportsFor = (included: ReadonlySet<TodoGenerationBlockId>, entity: string) => ({
  domain: [
    ...(included.has("model")
      ? [
          `${entity}Id`,
          entity,
          `${entity}TextInvalid`,
          `${entity}NotFound`,
          `${entity}AlreadyCompleted`,
          `${entity}IdExhausted`,
          `${entity}PersistenceError`,
        ]
      : []),
    ...(included.has("event") ? [`${entity}Event`] : []),
  ],
  application: [
    ...(included.has("port")
      ? [`${entity}Repository`, `${entity}Clock`, `${entity}IdGenerator`, `${entity}Events`]
      : []),
    ...(included.has("use-case") ? [`${entity}Application`, "layer"] : []),
  ],
  infrastructure: included.has("integration-adapter") ? [`${entity}TestProbe`, "testLayer", "liveLayer"] : [],
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
  const exports = exportsFor(selectedWithPrerequisites(selected), context.entity.singular)
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
        from: `./${packageId === "domain" ? (name === `${context.entity.singular}Event` ? "event" : "model") : packageId === "application" ? (["Repository", "Clock", "IdGenerator", "Events"].some((suffix) => name === `${context.entity.singular}${suffix}`) ? "port" : "use-case") : packageId === "infrastructure" ? "adapter" : "presentation"}.js`,
        name,
      })),
      packageId,
    })),
  })
}
