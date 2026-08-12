import { createHash } from "node:crypto"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Kernel from "../kernel.js"
import { renderTemplate, templateAsset } from "../templates.js"
const canonicalTemplate = (path: string): string =>
  renderTemplate(
    templateAsset({
      directory: "todo-v1",
      group: "todo-v1",
      outputPath: path,
      sourcePath: `${path}.template`,
      substitutions: { tmpl: "" },
    }),
  )
const contribution = (
  content: string,
  owner: string,
  packageId: Kernel.FileContribution["package"],
  path: string,
  surface: string,
): Kernel.FileContribution =>
  Object.freeze({
    bytes: new TextEncoder().encode(content),
    mode: "100644",
    owner: Kernel.identifier(owner),
    package: packageId,
    path: Kernel.safeRelativePath(path),
    sourceDigest: Kernel.sourceDigest(`sha256:${createHash("sha256").update(content).digest("hex")}`),
    surface: Kernel.identifier(surface),
    template: templateAsset({
      directory: "todo-v1",
      group: "todo-v1",
      outputPath: path,
      sourcePath: `${path}.template`,
      substitutions: { tmpl: "" },
    }),
  })
const workspace: Kernel.AtomicGenerator<unknown> = {
  InputSchema: Schema.Unknown,
  id: Kernel.identifier("todo-v1-workspace"),
  provides: Kernel.capabilities("todo-v1-workspace"),
  requires: Kernel.capabilities(),
  version: "1",
  render: () =>
    Effect.succeed(
      Object.freeze(
        ["nx.json", "package.json", "pnpm-workspace.yaml", "tsconfig.build.json", "vitest.config.mts"].map((path) =>
          contribution(
            canonicalTemplate(path),
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
      return Effect.fail(new Kernel.RenderFailure({ generatorId: capability, reason: "unsafe-path" }))
    const owner = `package-surface-${id}`
    return Effect.succeed(
      Object.freeze([
        contribution(
          canonicalTemplate(`${target.root}/package.json`),
          `${owner}-manifest`,
          target.id,
          `${target.root}/package.json`,
          "package-surface",
        ),
        contribution(
          canonicalTemplate(`${target.root}/src/index.ts`),
          `${owner}-barrel`,
          target.id,
          `${target.root}/src/index.ts`,
          "package-surface",
        ),
      ]),
    )
  },
})
const templateTest = (packageId: string, path: string) => [packageId, path, canonicalTemplate(path)] as const
const leafFiles = {
  model: templateTest("domain", "packages/todo/domain/tests/todo.test.ts"),
  event: ["domain", "packages/todo/domain/src/events.ts", 'export type { TodoEvent } from "./index.js"\n'],
  port: ["application", undefined, undefined],
  "use-case": [
    "application",
    "packages/todo/application/src/use-case.ts",
    'export { TodoApplication } from "./index.js"\n',
  ],
  "integration-adapter": templateTest("infrastructure", "packages/todo/infrastructure/tests/todo-runtime.test.ts"),
  presentation: templateTest("presentation", "apps/todo-cli/tests/todo.test.ts"),
} as const
const leaf = (id: keyof typeof leafFiles, requires: ReadonlyArray<string>): Kernel.AtomicGenerator<unknown> => {
  const [packageId, path, content] = leafFiles[id]
  return {
    InputSchema: Schema.Unknown,
    id: Kernel.identifier(`todo-v1-${id}`),
    provides: Kernel.capabilities(`todo-v1-${id}`),
    requires: Kernel.capabilities(...requires),
    version: "1",
    render: (_input, context) => {
      const target = context.packages.find((candidate) => candidate.id === packageId)
      if (target === undefined)
        return Effect.fail(new Kernel.RenderFailure({ generatorId: `todo-v1-${id}`, reason: "unsafe-path" }))
      return Effect.succeed(
        path === undefined || content === undefined
          ? Object.freeze([])
          : Object.freeze([
              contribution(
                content,
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
