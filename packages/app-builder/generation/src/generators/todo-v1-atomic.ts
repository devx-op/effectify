import { createHash } from "node:crypto"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Kernel from "../kernel.js"
import { todoTemplateContent } from "../templates/todo/index.js"
const json = (source: string): string => `${JSON.stringify(JSON.parse(source), null, 2)}\n`
const rootFiles = {
  "nx.json": json(
    '{"defaultBase":"HEAD","plugins":[{"plugin":"@nx/js/typescript","options":{"typecheck":{"targetName":"typecheck"}}},{"plugin":"@nx/vitest","options":{"testTargetName":"test"}}]}',
  ),
  "package.json": json(
    '{"name":"@effectify/todo-workspace","packageManager":"pnpm@10.14.0","private":true,"scripts":{"build":"pnpm exec tsc -p tsconfig.build.json","test":"pnpm exec vitest run --config vitest.config.mts","typecheck":"pnpm exec tsc --noEmit -p tsconfig.build.json"},"devDependencies":{"@effect/vitest":"catalog:","@types/node":"catalog:","@nx/js":"catalog:","@nx/vitest":"23.1.0","effect":"catalog:","nx":"23.1.0","typescript":"catalog:","vitest":"catalog:"}}',
  ),
  "pnpm-workspace.yaml":
    'packages:\n  - apps/*\n  - packages/*/*\n\ncatalog:\n  "@effect/vitest": 4.0.0-beta.102\n  "@nx/js": 23.1.0\n  "@types/node": 20.19.25\n  effect: 4.0.0-beta.102\n  typescript: 6.0.3\n  vitest: 4.1.10\n',
  "tsconfig.build.json": json(
    '{"compilerOptions":{"module":"NodeNext","moduleResolution":"NodeNext","outDir":"dist","rootDir":".","skipLibCheck":true,"strict":true,"target":"ES2022","types":["node"]},"include":["apps/**/src/**/*.ts","packages/**/src/**/*.ts"]}',
  ),
  "vitest.config.mts":
    'import { defineConfig } from "vitest/config"\n\nexport default defineConfig({\n  test: {\n    environment: "node",\n    include: ["apps/**/tests/**/*.test.ts", "packages/**/tests/**/*.test.ts"],\n    watch: false,\n  },\n})\n',
} as const
const canonicalTemplate = (path: string): string =>
  todoTemplateContent(path)
    .replaceAll(
      'import * as Application from "../../../packages/todo/application/src/index.js"\nimport * as Infrastructure from "../../../packages/todo/infrastructure/src/index.js"\nimport type { TodoEvent } from "../../../packages/todo/domain/src/index.js"',
      'import * as Application from "@effectify/todo-application"\nimport type { TodoEvent } from "@effectify/todo-domain"\nimport * as Infrastructure from "@effectify/todo-infrastructure"',
    )
    .replaceAll(
      'import * as Effect from "effect/Effect"\nimport * as Layer from "effect/Layer"\nimport * as Application from "../../application/src/index.js"',
      'import * as Application from "@effectify/todo-application"\nimport * as Effect from "effect/Effect"\nimport * as Layer from "effect/Layer"',
    )
    .replaceAll("../../application/src/index.js", "@effectify/todo-application")
    .replaceAll("../../domain/src/index.js", "@effectify/todo-domain")
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
        Object.entries(rootFiles).map(([path, content]) =>
          contribution(
            content,
            `workspace-surface-${path.replace(/[^a-z0-9]+/g, "-")}`,
            "workspace",
            path,
            "workspace",
          ),
        ),
      ),
    ),
}
const packageScripts = {
  build: "pnpm -w exec tsc -p tsconfig.build.json",
  test: "pnpm -w exec vitest run --config vitest.config.mts",
  typecheck: "pnpm -w exec tsc --noEmit -p tsconfig.build.json",
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
    const links = resolved.filter((dependency): dependency is Kernel.PackageTarget => dependency !== undefined)
    const manifest = json(
      `{"name":${JSON.stringify(target.name)},"private":true,"type":"module","exports":{".":"./src/index.ts"},"scripts":${JSON.stringify(packageScripts)},"dependencies":${JSON.stringify(Object.fromEntries([["effect", "catalog:"], ...links.map((dependency) => [dependency.name, "workspace:*"])]))}}`,
    )
    const owner = `package-surface-${id}`
    return Effect.succeed(
      Object.freeze([
        contribution(manifest, `${owner}-manifest`, target.id, `${target.root}/package.json`, "package-surface"),
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
