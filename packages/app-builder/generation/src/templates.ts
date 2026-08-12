import { readFileSync } from "node:fs"
import { dirname, isAbsolute, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

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
}

export interface TemplateGroup {
  readonly directory: string
  readonly id: string
  readonly outputPaths: ReadonlyArray<string>
  readonly substitutions: TemplateSubstitutions
}

const root = fileURLToPath(new URL("./templates/assets/", import.meta.url))
const safe = (value: string): boolean =>
  value.length > 0 &&
  !isAbsolute(value) &&
  !value.includes("\\") &&
  value.split("/").every((segment) => /^[A-Za-z0-9_.-]+$/.test(segment) && segment !== "." && segment !== "..")

export const templateRoot = (): string => root

export const templateDirectory = (group: Pick<TemplateGroup, "directory">): string => {
  if (!safe(group.directory)) throw new Error(`Unsafe template directory: ${group.directory}`)
  const directory = join(root, group.directory)
  if (relative(root, directory).startsWith("..")) throw new Error(`Template directory escapes package: ${directory}`)
  return directory
}

export const templateAsset = (options: TemplateAsset): TemplateAsset => {
  if (![options.directory, options.group, options.outputPath, options.sourcePath].every(safe)) {
    throw new Error(`Unsafe template asset: ${options.sourcePath}`)
  }
  return Object.freeze({
    ...options,
    substitutions: Object.freeze({ ...options.substitutions }),
  })
}

const renderCompatibleEjs = (source: string, substitutions: TemplateSubstitutions): string => {
  const loop = /<% for \(const (\w+) of JSON\.parse\((\w+)\)\) \{ -%>\n([\s\S]*?)<% \} -%>\n?/g
  const expanded = source.replace(loop, (_match, itemName: string, sourceName: string, body: string) => {
    const encoded = substitutions[sourceName]
    const items = encoded === undefined ? undefined : JSON.parse(encoded)
    if (!Array.isArray(items)) throw new Error(`Unknown template collection: ${sourceName}`)
    return items
      .map((item: unknown) =>
        body.replace(
          new RegExp(`<%-\\s*${itemName}\\.([A-Za-z][A-Za-z0-9]*)\\s*%>`, "g"),
          (_propertyMatch: string, property: string) => {
            if (typeof item !== "object" || item === null || typeof Reflect.get(item, property) !== "string") {
              throw new Error(`Invalid template collection member: ${sourceName}.${property}`)
            }
            return Reflect.get(item, property) as string
          },
        ),
      )
      .join("")
  })
  const rendered = expanded.replace(/<%-\s*([A-Za-z][A-Za-z0-9]*)\s*%>/g, (_match, name: string) => {
    const value = substitutions[name]
    if (value === undefined) throw new Error(`Unknown template substitution: ${name}`)
    return value
  })
  if (rendered.includes("<%")) throw new Error("Template uses unsupported EJS syntax")
  return rendered
}

/** Renders the bounded raw-substitution and collection subset shared with Nx generateFiles/EJS. */
export const renderTemplate = (asset: TemplateAsset): string => {
  const source = join(templateDirectory(asset), asset.sourcePath)
  if (relative(root, dirname(source)).startsWith("..")) throw new Error(`Template source escapes package: ${source}`)
  return renderCompatibleEjs(readFileSync(source, "utf8"), asset.substitutions)
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
        }),
      )
      continue
    }
    if (
      existing.directory !== asset.directory ||
      JSON.stringify(existing.substitutions) !== JSON.stringify(asset.substitutions)
    ) {
      throw new Error(`Inconsistent template group: ${asset.group}`)
    }
    groups.set(
      asset.group,
      Object.freeze({ ...existing, outputPaths: Object.freeze([...existing.outputPaths, asset.outputPath]) }),
    )
  }
  return Object.freeze([...groups.values()].sort((left, right) => left.id.localeCompare(right.id)))
}
