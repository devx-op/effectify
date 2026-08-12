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
import {
  renderTemplate,
  templateAsset,
  templateSubstitutions,
  type TemplateAsset,
  type TemplateSubstitutions,
} from "../templates.js"

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

const digest = (content: string) => sourceDigest(`sha256:${createHash("sha256").update(content).digest("hex")}`)
const contribution = (
  content: string,
  owner: string,
  packageId: FileContribution["package"],
  path: string,
  surface: string,
  template: TemplateAsset,
) =>
  Object.freeze({
    bytes: new TextEncoder().encode(content),
    mode: "100644",
    owner: identifier(owner),
    package: packageId,
    path: safeRelativePath(path),
    sourceDigest: digest(content),
    surface: identifier(surface),
    template,
  })

const workspaceSubstitutions = (context: RenderContext): TemplateSubstitutions => templateSubstitutions(context)

export const workspaceSurfaceGenerator: AtomicGenerator<PackageSurfaceInput> = {
  InputSchema: PackageSurfaceInputSchema,
  id: identifier("workspace-surface"),
  provides: capabilities("workspace-surface"),
  render: (_input, context): Effect.Effect<ReadonlyArray<FileContribution>, GenerationFailure> => {
    const substitutions = workspaceSubstitutions(context)
    return Effect.succeed(
      Object.freeze(
        WorkspaceRootFiles.map((path) => {
          const template = templateAsset({
            directory: "generic/workspace",
            group: "workspace-surface",
            outputPath: path,
            sourcePath: `${path}.template`,
            substitutions,
          })
          return contribution(
            renderTemplate(template),
            `workspace-surface-${path.replace(/[^a-z0-9]+/g, "-")}`,
            "workspace",
            path,
            "workspace",
            template,
          )
        }),
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
      const substitutions = templateSubstitutions(context, {
        dependenciesJson: JSON.stringify(
          Object.fromEntries(resolved.map((dependency) => [dependency.name, "workspace:*"]).sort()),
          null,
          2,
        ),
        exportsJson: JSON.stringify(
          [...definition.exports].sort(
            (left, right) => left.name.localeCompare(right.name) || left.from.localeCompare(right.from),
          ),
        ),
        packageName: target.name,
        targetRoot: target.root,
      })
      const manifestTemplate = templateAsset({
        directory: "generic/package",
        group: `package-surface-${target.id}`,
        outputPath: `${target.root}/package.json`,
        sourcePath: "__targetRoot__/package.json.template",
        substitutions,
      })
      const barrelTemplate = templateAsset({
        directory: "generic/package",
        group: `package-surface-${target.id}`,
        outputPath: `${target.root}/src/index.ts`,
        sourcePath: "__targetRoot__/src/index.ts.template",
        substitutions,
      })
      return Effect.succeed([
        contribution(
          renderTemplate(manifestTemplate),
          `${owner}-manifest`,
          target.id,
          `${target.root}/package.json`,
          "package-surface",
          manifestTemplate,
        ),
        contribution(
          renderTemplate(barrelTemplate),
          `${owner}-barrel`,
          target.id,
          `${target.root}/src/index.ts`,
          "package-surface",
          barrelTemplate,
        ),
      ])
    }).pipe(Effect.map((files) => Object.freeze(files.flat())))
  },
  requires: capabilities("workspace-surface"),
  version: "1",
}

export const SurfaceCatalog = defineCatalog([workspaceSurfaceGenerator, packageSurfaceGenerator])
