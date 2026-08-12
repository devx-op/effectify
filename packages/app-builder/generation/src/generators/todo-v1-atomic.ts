import { createHash } from "node:crypto"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Kernel from "../kernel.js"
import { renderTemplate, templateAsset, templateSubstitutions } from "../templates.js"
const contribution = (
  context: Kernel.RenderContext,
  sourcePath: string,
  owner: string,
  packageId: Kernel.FileContribution["package"],
  path: string,
  surface: string,
): Kernel.FileContribution => {
  const [directory, ...relativeSource] = sourcePath.split("/")
  const targetRoot = packageId === "workspace" ? undefined : context.packages.find(({ id }) => id === packageId)?.root
  const template = templateAsset({
    directory: `blueprint/${directory}`,
    group: `todo-v1-${packageId}`,
    sourcePath: relativeSource.join("/"),
    substitutions: templateSubstitutions(context, targetRoot === undefined ? {} : { targetRoot }),
  })
  const content = renderTemplate(template)
  return Object.freeze({
    bytes: new TextEncoder().encode(content),
    mode: "100644",
    owner: Kernel.identifier(owner),
    package: packageId,
    path: Kernel.safeRelativePath(path),
    sourceDigest: Kernel.sourceDigest(`sha256:${createHash("sha256").update(content).digest("hex")}`),
    surface: Kernel.identifier(surface),
    template,
  })
}
const workspace: Kernel.AtomicGenerator<unknown> = {
  InputSchema: Schema.Unknown,
  id: Kernel.identifier("todo-v1-workspace"),
  provides: Kernel.capabilities("todo-v1-workspace"),
  requires: Kernel.capabilities(),
  version: "1",
  render: (_input, context) =>
    Effect.succeed(
      Object.freeze(
        ["nx.json", "package.json", "pnpm-workspace.yaml", "tsconfig.build.json", "vitest.config.mts"].map((path) =>
          contribution(
            context,
            `workspace/${path}.template`,
            `workspace-surface-${path.replace(/[^a-z0-9]+/g, "-")}`,
            "workspace",
            path,
            "workspace",
          ),
        ),
      ),
    ),
}
const definitions = [
  ["domain", [], "todo-v1-domain-surface"],
  ["application", ["domain"], "todo-v1-application-surface"],
  ["infrastructure", ["application", "domain"], "todo-v1-infrastructure-surface"],
  ["presentation", ["infrastructure", "application", "domain"], "todo-v1-presentation-surface"],
] as const
const packageSurface = (
  id: (typeof definitions)[number][0],
  dependencies: ReadonlyArray<string>,
  capability: string,
): Kernel.AtomicGenerator<unknown> => ({
  InputSchema: Schema.Unknown,
  id: Kernel.identifier(capability),
  provides: Kernel.capabilities(capability),
  requires: Kernel.capabilities("todo-v1-workspace"),
  version: "1",
  render: (_input, context) => {
    const target = context.packages.find((candidate) => candidate.id === id)
    const resolved = dependencies.map((dependency) => context.packages.find((candidate) => candidate.id === dependency))
    if (target === undefined || resolved.some((dependency) => dependency === undefined))
      return Effect.fail(
        new Kernel.RenderFailure({
          generatorId: capability,
          reason: "unsafe-path",
        }),
      )
    const owner = `package-surface-${id}`
    return Effect.succeed(
      Object.freeze([
        contribution(
          context,
          `${id === "domain" ? "layer-1" : id === "application" ? "layer-2" : id === "infrastructure" ? "layer-3" : "layer-4"}/__targetRoot__/package.json.template`,
          `${owner}-manifest`,
          target.id,
          `${target.root}/package.json`,
          "package-surface",
        ),
        contribution(
          context,
          `${id === "domain" ? "layer-1" : id === "application" ? "layer-2" : id === "infrastructure" ? "layer-3" : "layer-4"}/__targetRoot__/src/index.ts.template`,
          `${owner}-barrel`,
          target.id,
          `${target.root}/src/index.ts`,
          "package-surface",
        ),
      ]),
    )
  },
})
const templateTest = (packageId: string, sourcePath: string, relativePath: string) =>
  [packageId, sourcePath, relativePath] as const
const leafFiles = {
  model: templateTest(
    "domain",
    "layer-1/__targetRoot__/tests/__entityId__.test.ts.template",
    "tests/__entityId__.test.ts",
  ),
  event: templateTest("domain", "layer-1/__targetRoot__/src/events.ts.template", "src/events.ts"),
  port: ["application", undefined, undefined],
  "use-case": templateTest("application", "layer-2/__targetRoot__/src/use-case.ts.template", "src/use-case.ts"),
  "integration-adapter": templateTest(
    "infrastructure",
    "layer-3/__targetRoot__/tests/__entityId__-runtime.test.ts.template",
    "tests/__entityId__-runtime.test.ts",
  ),
  presentation: templateTest(
    "presentation",
    "layer-4/__targetRoot__/tests/__entityId__.test.ts.template",
    "tests/__entityId__.test.ts",
  ),
} as const
const leaf = (id: keyof typeof leafFiles, requires: ReadonlyArray<string>): Kernel.AtomicGenerator<unknown> => {
  const [packageId, sourcePath, relativePath] = leafFiles[id]
  return {
    InputSchema: Schema.Unknown,
    id: Kernel.identifier(`todo-v1-${id}`),
    provides: Kernel.capabilities(`todo-v1-${id}`),
    requires: Kernel.capabilities(...requires),
    version: "1",
    render: (_input, context) => {
      const target = context.packages.find((candidate) => candidate.id === packageId)
      if (target === undefined)
        return Effect.fail(
          new Kernel.RenderFailure({
            generatorId: `todo-v1-${id}`,
            reason: "unsafe-path",
          }),
        )
      if (sourcePath === undefined || relativePath === undefined) return Effect.succeed(Object.freeze([]))
      const path = `${target.root}/${relativePath.replace("__entityId__", context.entity.id)}`
      return Effect.succeed(
        Object.freeze([
          contribution(
            context,
            sourcePath,
            `todo-${id}-${path.replace(/[^a-z0-9]+/g, "-")}`,
            target.id,
            path,
            "todo-capability",
          ),
        ]),
      )
    },
  }
}
const [domainSurface, applicationSurface, infrastructureSurface, presentationSurface] = definitions.map(
  ([id, dependencies, capability]) => packageSurface(id, dependencies, capability),
)
const model = leaf("model", ["todo-v1-domain-surface"])
const event = leaf("event", ["todo-v1-model", "todo-v1-domain-surface"])
const port = leaf("port", ["todo-v1-model", "todo-v1-application-surface"])
const useCase = leaf("use-case", ["todo-v1-port", "todo-v1-application-surface"])
const adapter = leaf("integration-adapter", ["todo-v1-use-case", "todo-v1-infrastructure-surface"])
const presentation = leaf("presentation", ["todo-v1-integration-adapter", "todo-v1-presentation-surface"])
export const DefaultTodoRenderContext = Object.freeze({
  version: "effectify.render-context/1" as const,
  workspace: Object.freeze({ name: "todo-workspace", npmScope: "@effectify" }),
  domain: Object.freeze({ id: "todo", name: "Todo", importName: "@effectify/todo-domain" }),
  entity: Object.freeze({ id: "todo", singular: "Todo", plural: "Todos" }),
  entrypoint: Object.freeze({ id: "todo-cli", name: "TodoCli", importName: "@effectify/todo-cli" }),
  packages: Object.freeze(
    [
      ["domain", "@effectify/todo-domain", "packages/todo/domain"],
      ["application", "@effectify/todo-application", "packages/todo/application"],
      ["infrastructure", "@effectify/todo-infrastructure", "packages/todo/infrastructure"],
      ["presentation", "@effectify/todo-cli", "apps/todo-cli"],
    ].map(([id, name, root]) =>
      Object.freeze({ id: Kernel.identifier(id!), name: name!, root: Kernel.safeRelativePath(root!) }),
    ),
  ),
})
export const TodoV1AtomicCatalog = Kernel.defineCatalog([
  workspace,
  domainSurface,
  applicationSurface,
  infrastructureSurface,
  presentationSurface,
  model,
  event,
  port,
  useCase,
  adapter,
  presentation,
])
const todoV1Identity = (context: Kernel.RenderContext): string =>
  JSON.stringify({
    version: context.version,
    workspace: context.workspace,
    domain: context.domain,
    entity: context.entity,
    entrypoint: context.entrypoint,
    packages: [...context.packages].sort((left, right) => left.id.localeCompare(right.id)),
  })
const TodoV1Identity = todoV1Identity(DefaultTodoRenderContext)
export const isTodoV1Context = (context: Kernel.RenderContext): boolean => todoV1Identity(context) === TodoV1Identity
export const todoV1GeneratorIds = (selected: ReadonlyArray<string>) =>
  selected.map((id) => Kernel.identifier(`todo-v1-${id}`))
