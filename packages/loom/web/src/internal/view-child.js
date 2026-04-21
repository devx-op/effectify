import * as LoomCore from "@effectify/loom-core"

const isComponentChild = (child) =>
  typeof child === "object" && child !== null && "_tag" in child && child._tag === "Component" &&
  "node" in child && "capabilities" in child

const isNodeChild = (child) =>
  typeof child === "object" && child !== null && "_tag" in child && child._tag !== "Component"

const isPrimitiveTextChild = (child) =>
  typeof child === "string" || typeof child === "number" || typeof child === "bigint"

export const isViewChild = (value) => {
  if (value === undefined || value === null || value === false) {
    return true
  }

  if (isPrimitiveTextChild(value) || Array.isArray(value)) {
    return true
  }

  return typeof value === "object" && value !== null && "_tag" in value
}

export const normalizeViewChild = (child) => {
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

export const normalizeViewChildren = (children) => children.flatMap(normalizeViewChild)
