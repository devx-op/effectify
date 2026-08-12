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
  const sourceRoot = [
    "apps/todo-cli",
    "packages/todo/application",
    "packages/todo/domain",
    "packages/todo/infrastructure",
  ].find((root) => sourcePath.startsWith(`${root}/`))
  const targetDirectory =
    packageId === "workspace" ? "" : context.packages.find((target) => target.id === packageId)?.root
  const template = templateAsset({
    directory: sourceRoot === undefined ? "todo-v1" : `todo-v1/${sourceRoot}`,
    group: `todo-v1-${packageId}`,
    outputPath: path,
    sourcePath: sourceRoot === undefined ? sourcePath : sourcePath.slice(sourceRoot.length + 1),
    substitutions: templateSubstitutions(context),
    targetDirectory,
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
            `${path}.template`,
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
const sourceRoot = (id: string) => (id === "presentation" ? "apps/todo-cli" : `packages/todo/${id}`)
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
          `${sourceRoot(id)}/package.json.template`,
          `${owner}-manifest`,
          target.id,
          `${target.root}/package.json`,
          "package-surface",
        ),
        contribution(
          context,
          `${sourceRoot(id)}/src/index.ts.template`,
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
    "packages/todo/domain/tests/__entityId__.test.ts.template",
    "tests/__entityId__.test.ts",
  ),
  event: templateTest("domain", "packages/todo/domain/src/events.ts.template", "src/events.ts"),
  port: ["application", undefined, undefined],
  "use-case": templateTest("application", "packages/todo/application/src/use-case.ts.template", "src/use-case.ts"),
  "integration-adapter": templateTest(
    "infrastructure",
    "packages/todo/infrastructure/tests/__entityId__-runtime.test.ts.template",
    "tests/__entityId__-runtime.test.ts",
  ),
  presentation: templateTest(
    "presentation",
    "apps/todo-cli/tests/__entityId__.test.ts.template",
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
      const path = `${target.root}/${relativePath.replaceAll("__entityId__", context.entity.id)}`
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
const TodoV1Identity =
  '{"version":"effectify.render-context/1","workspace":{"name":"todo-workspace","npmScope":"@effectify"},"domain":{"id":"domain","importName":"@effectify/todo-domain"},"entity":{"id":"todo","singular":"Todo","plural":"Todos","importName":"@effectify/todo-cli"},"packages":[{"id":"application","name":"@effectify/todo-application","root":"packages/todo/application"},{"id":"domain","name":"@effectify/todo-domain","root":"packages/todo/domain"},{"id":"infrastructure","name":"@effectify/todo-infrastructure","root":"packages/todo/infrastructure"},{"id":"presentation","name":"@effectify/todo-cli","root":"apps/todo-cli"}]}'
const todoV1Identity = (context: Kernel.RenderContext): string =>
  JSON.stringify({
    version: context.version,
    workspace: context.workspace,
    domain: context.domain,
    entity: context.entity,
    packages: [...context.packages].sort((left, right) => left.id.localeCompare(right.id)),
  })
export const isTodoV1Context = (context: Kernel.RenderContext): boolean => todoV1Identity(context) === TodoV1Identity
export const todoV1GeneratorIds = (selected: ReadonlyArray<string>) =>
  selected.map((id) => Kernel.identifier(`todo-v1-${id}`))
