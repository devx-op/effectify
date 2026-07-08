import * as LoomCore from "@effectify/loom-core"

export type ViewChild =
  | LoomCore.Ast.Node
  | LoomCore.Component.Definition
  | string
  | number
  | bigint
  | ReadonlyArray<unknown>
  | undefined
  | null
  | false

const isComponentChild = (child: ViewChild): child is LoomCore.Component.Definition =>
  typeof child === "object" && child !== null && "_tag" in child && child._tag === "Component" &&
  "node" in child && "capabilities" in child

const isNodeChild = (child: ViewChild): child is LoomCore.Ast.Node =>
  typeof child === "object" && child !== null && "_tag" in child && child._tag !== "Component"

const isPrimitiveTextChild = (child: ViewChild): child is string | number | bigint =>
  typeof child === "string" || typeof child === "number" || typeof child === "bigint"

export const isViewChild = (value: unknown): value is ViewChild => {
  if (value === undefined || value === null || value === false) {
    return true
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint" || Array.isArray(value)) {
    return true
  }

  return typeof value === "object" && value !== null && "_tag" in value
}

export const normalizeViewChild = (child: ViewChild): ReadonlyArray<LoomCore.Ast.Node> => {
  if (child === undefined || child === null || child === false) {
    return []
  }

  if (isPrimitiveTextChild(child)) {
    return [{ _tag: "Text", value: String(child) }]
  }

  if (Array.isArray(child)) {
    return child.flatMap(normalizeViewChild)
  }

  if (isComponentChild(child)) {
    return [LoomCore.Ast.componentUse(child)]
  }

  if (isNodeChild(child)) {
    return [child]
  }

  return []
}

export const normalizeViewChildren = (children: ReadonlyArray<ViewChild>): ReadonlyArray<LoomCore.Ast.Node> =>
  children.flatMap(normalizeViewChild)
