import { createHash } from "node:crypto"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import {
  capabilities,
  defineCatalog,
  identifier,
  safeRelativePath,
  sourceDigest,
  type AtomicGenerator,
  type FileContribution,
  type GenerationFailure,
  type PackageTarget,
  type RenderContext,
  RenderFailure,
} from "../kernel.js"

export const WorkspaceRootFiles = [
  "nx.json",
  "package.json",
  "pnpm-workspace.yaml",
  "tsconfig.build.json",
  "vitest.config.mts",
] as const

export type WorkspaceRootFile = (typeof WorkspaceRootFiles)[number]

const PackageSurfaceInputSchema = Schema.Struct({
  packages: Schema.Array(
    Schema.Struct({
      dependencies: Schema.Array(Schema.String),
      exports: Schema.Array(Schema.Struct({ from: Schema.String, name: Schema.String })),
      packageId: Schema.String,
    }),
  ),
})

export interface PackageSurfaceInput extends Schema.Schema.Type<typeof PackageSurfaceInputSchema> {}

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`
const digest = (content: string) => sourceDigest(`sha256:${createHash("sha256").update(content).digest("hex")}`)
const contribution = (
  content: string,
  owner: string,
  packageId: FileContribution["package"],
  path: string,
  surface: string,
) =>
  Object.freeze({
    bytes: new TextEncoder().encode(content),
    mode: "100644",
    owner: identifier(owner),
    package: packageId,
    path: safeRelativePath(path),
    sourceDigest: digest(content),
    surface: identifier(surface),
  })

const workspaceFiles = (context: RenderContext): Readonly<Record<WorkspaceRootFile, string>> => ({
  "nx.json": json({
    defaultBase: "HEAD",
    plugins: [
      { plugin: "@nx/js/typescript", options: { typecheck: { targetName: "typecheck" } } },
      { plugin: "@nx/vitest", options: { testTargetName: "test" } },
    ],
  }),
  "package.json": json({
    name: `${context.workspace.npmScope}/${context.workspace.name}`,
    packageManager: "pnpm@10.14.0",
    private: true,
    scripts: {
      build: "pnpm exec tsc -p tsconfig.build.json",
      test: "pnpm exec vitest run --config vitest.config.mts",
      typecheck: "pnpm exec tsc --noEmit -p tsconfig.build.json",
    },
    devDependencies: {
      "@nx/js": "23.1.0",
      "@nx/vitest": "23.1.0",
      nx: "23.1.0",
      typescript: "6.0.3",
      vitest: "4.1.10",
    },
  }),
  "pnpm-workspace.yaml": "packages:\n  - apps/*\n  - packages/*/*\n",
  "tsconfig.build.json": json({
    compilerOptions: {
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      target: "ES2022",
      types: ["node"],
    },
    include: ["apps/**/src/**/*.ts", "packages/**/src/**/*.ts"],
  }),
  "vitest.config.mts":
    'import { defineConfig } from "vitest/config"\n\nexport default defineConfig({ test: { environment: "node", watch: false } })\n',
})

export const workspaceSurfaceGenerator: AtomicGenerator<PackageSurfaceInput> = {
  InputSchema: PackageSurfaceInputSchema,
  id: identifier("workspace-surface"),
  provides: capabilities("workspace-surface"),
  render: (_input, context): Effect.Effect<ReadonlyArray<FileContribution>, GenerationFailure> => {
    const files = workspaceFiles(context)
    return Effect.succeed(
      Object.freeze(
        WorkspaceRootFiles.map((path) =>
          contribution(
            files[path],
            `workspace-surface-${path.replace(/[^a-z0-9]+/g, "-")}`,
            "workspace",
            path,
            "workspace",
          ),
        ),
      ),
    )
  },
  requires: capabilities(),
  version: "1",
}

const safeExport = (entry: PackageSurfaceInput["packages"][number]["exports"][number]): boolean =>
  /^[A-Za-z][A-Za-z0-9]*$/.test(entry.name) &&
  /^\.\/[A-Za-z0-9][A-Za-z0-9./_-]*$/.test(entry.from) &&
  !entry.from.includes("..")

const packageJson = (target: PackageTarget, dependencies: ReadonlyArray<PackageTarget>) =>
  json({
    name: target.name,
    private: true,
    type: "module",
    exports: { ".": "./src/index.ts" },
    dependencies: Object.fromEntries(dependencies.map((dependency) => [dependency.name, "workspace:*"]).sort()),
  })

export const packageSurfaceGenerator: AtomicGenerator<PackageSurfaceInput> = {
  InputSchema: PackageSurfaceInputSchema,
  id: identifier("package-surface"),
  provides: capabilities("package-surface"),
  render: (input, context): Effect.Effect<ReadonlyArray<FileContribution>, GenerationFailure> => {
    const definitions = new Map(input.packages.map((definition) => [definition.packageId, definition]))
    if (definitions.size !== context.packages.length || definitions.size !== input.packages.length) {
      return Effect.fail(new RenderFailure({ generatorId: "package-surface", reason: "unsafe-path" }))
    }
    return Effect.forEach(context.packages, (target) => {
      const definition = definitions.get(target.id)
      const dependencies = definition?.dependencies.map((id) =>
        context.packages.find((candidate) => candidate.id === id),
      )
      if (
        definition === undefined ||
        dependencies === undefined ||
        dependencies.some((dependency) => dependency === undefined || dependency.id === target.id) ||
        new Set(definition.dependencies).size !== definition.dependencies.length ||
        new Set(definition.exports.map((entry) => entry.name)).size !== definition.exports.length ||
        !definition.exports.every(safeExport)
      ) {
        return Effect.fail(new RenderFailure({ generatorId: "package-surface", reason: "unsafe-path" }))
      }
      const owner = `package-surface-${target.id}`
      const resolved = dependencies.filter((dependency): dependency is PackageTarget => dependency !== undefined)
      const barrel = [...definition.exports]
        .sort((left, right) => left.name.localeCompare(right.name) || left.from.localeCompare(right.from))
        .map((entry) => `export { ${entry.name} } from "${entry.from}"\n`)
        .join("")
      return Effect.succeed([
        contribution(
          packageJson(target, resolved),
          `${owner}-manifest`,
          target.id,
          `${target.root}/package.json`,
          "package-surface",
        ),
        contribution(barrel, `${owner}-barrel`, target.id, `${target.root}/src/index.ts`, "package-surface"),
      ])
    }).pipe(Effect.map((files) => Object.freeze(files.flat())))
  },
  requires: capabilities("workspace-surface"),
  version: "1",
}

export const SurfaceCatalog = defineCatalog([workspaceSurfaceGenerator, packageSurfaceGenerator])
