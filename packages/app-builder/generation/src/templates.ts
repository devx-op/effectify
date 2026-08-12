import { readFileSync } from "node:fs"
import { dirname, isAbsolute, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import ejs from "ejs"

export interface TemplateSubstitutions {
  readonly tmpl: ""
  readonly [name: string]: string
}

export interface TemplateAsset {
  readonly directory: string
  readonly group: string
  readonly outputPath: string
  readonly sourcePath: string
  readonly substitutions: TemplateSubstitutions
  readonly targetDirectory?: string
}

export interface TemplateGroup {
  readonly directory: string
  readonly id: string
  readonly outputPaths: ReadonlyArray<string>
  readonly substitutions: TemplateSubstitutions
  readonly targetDirectory: string
}

const root = fileURLToPath(new URL("./templates/assets/", import.meta.url))
const safe = (value: string): boolean =>
  value.length > 0 &&
  !isAbsolute(value) &&
  !value.includes("\\") &&
  value.split("/").every((segment) => /^[A-Za-z0-9_.-]+$/.test(segment) && segment !== "." && segment !== "..")

export const templateRoot = (): string => root

type TemplateContext = Readonly<{
  workspace: { name: string; npmScope: string }
  entity: { id: string; singular: string; plural: string }
  packages: ReadonlyArray<{ id: string; name: string; root: string }>
}>
export const templateSubstitutions = (
  context: TemplateContext,
  overrides: Readonly<Record<string, string>> = {},
): TemplateSubstitutions => {
  const targets = Object.fromEntries(context.packages.map((target) => [target.id, target]))
  const domain = targets.domain ?? context.packages[0]!
  const application = targets.application ?? domain
  const infrastructure = targets.infrastructure ?? application
  const presentation = targets.presentation ?? application
  const roots = [...new Set(context.packages.map((target) => target.root.split("/")[0]))].sort()
  const globs = [...new Set(context.packages.map(({ root }) => root.replace(/\/[^/]+/g, "/*")))].sort()
  const typeName = (value: string) => `${value[0]?.toLowerCase()}${value.slice(1)}`
  return Object.freeze({
    applicationImport: application.name,
    applicationRoot: application.root,
    brandNamespace: context.workspace.npmScope.slice(1).replace(/(^|-)(\w)/g, (_, _dash, char) => char.toUpperCase()),
    domainImport: domain.name,
    domainRoot: domain.root,
    entityId: context.entity.id,
    entityIdentifier: typeName(context.entity.singular),
    entityPlural: context.entity.plural,
    entityPluralIdentifier: typeName(context.entity.plural),
    entitySingular: context.entity.singular,
    infrastructureImport: infrastructure.name,
    infrastructureRoot: infrastructure.root,
    presentationImport: presentation.name,
    presentationRoot: presentation.root,
    workspacePackageGlobs: globs.map((path) => `  - ${path}`).join("\n"),
    workspacePackageName: `${context.workspace.npmScope}/${context.workspace.name}`,
    workspaceScope: context.workspace.npmScope,
    workspaceSourceIncludes: roots.map((path) => `    "${path}/**/src/**/*.ts"`).join(",\n"),
    workspaceTestIncludes: roots.map((path) => `"${path}/**/tests/**/*.test.ts"`).join(", "),
    ...overrides,
    tmpl: "",
  })
}

export const templateDirectory = (group: Pick<TemplateGroup, "directory">): string => {
  if (!safe(group.directory)) throw new Error(`Unsafe template directory: ${group.directory}`)
  const directory = join(root, group.directory)
  if (relative(root, directory).startsWith("..")) throw new Error(`Template directory escapes package: ${directory}`)
  return directory
}

export const templateAsset = (options: TemplateAsset): TemplateAsset => {
  if (
    ![options.directory, options.group, options.outputPath, options.sourcePath].every(safe) ||
    (options.targetDirectory !== undefined && options.targetDirectory !== "" && !safe(options.targetDirectory))
  ) {
    throw new Error(`Unsafe template asset: ${options.sourcePath}`)
  }
  return Object.freeze({
    ...options,
    substitutions: Object.freeze({ ...options.substitutions }),
  })
}

/**
 * Renders synchronously with the same EJS semantics consumed by Nx generateFiles.
 * EJS executes JavaScript, so only validated package-owned templates may reach this boundary; substitutions are bounded immutable data.
 */
export const renderTemplate = (asset: TemplateAsset): string => {
  const source = join(templateDirectory(asset), asset.sourcePath)
  if (relative(root, dirname(source)).startsWith("..")) throw new Error(`Template source escapes package: ${source}`)
  return ejs.render(readFileSync(source, "utf8"), asset.substitutions, {
    filename: source,
  })
}

export const templateGroups = (
  contributions: ReadonlyArray<{ readonly template?: TemplateAsset }>,
): ReadonlyArray<TemplateGroup> => {
  const groups = new Map<string, TemplateGroup>()
  for (const contribution of contributions) {
    const asset = contribution.template
    if (asset === undefined) continue
    const existing = groups.get(asset.group)
    if (existing === undefined) {
      groups.set(
        asset.group,
        Object.freeze({
          directory: asset.directory,
          id: asset.group,
          outputPaths: Object.freeze([asset.outputPath]),
          substitutions: asset.substitutions,
          targetDirectory: asset.targetDirectory ?? "",
        }),
      )
      continue
    }
    if (
      existing.directory !== asset.directory ||
      existing.targetDirectory !== (asset.targetDirectory ?? "") ||
      JSON.stringify(existing.substitutions) !== JSON.stringify(asset.substitutions)
    ) {
      throw new Error(`Inconsistent template group: ${asset.group}`)
    }
    groups.set(
      asset.group,
      Object.freeze({
        ...existing,
        outputPaths: Object.freeze([...existing.outputPaths, asset.outputPath]),
      }),
    )
  }
  return Object.freeze([...groups.values()].sort((left, right) => left.id.localeCompare(right.id)))
}
