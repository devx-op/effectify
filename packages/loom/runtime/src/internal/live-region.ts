import type * as LoomCore from "@effectify/loom-core"
import * as Hydration from "../hydration.js"
import type * as Runtime from "../runtime.js"

const escapeText = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

const escapeAttribute = (value: string): string =>
  escapeText(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const runtimeManagedAttributeNames = new Set([
  Hydration.attributeName,
  Hydration.boundaryIdAttributeName,
  Hydration.eventNamesAttributeName,
  Hydration.nodeIdAttributeName,
  Hydration.nodeEventNamesAttributeName,
])

export const startMarker = (id: string): string => `${Hydration.liveMarkerPrefix}-start:${id}`

export const endMarker = (id: string): string => `${Hydration.liveMarkerPrefix}-end:${id}`

export const wrapHtml = (id: string, html: string): string => `<!--${startMarker(id)}-->${html}<!--${endMarker(id)}-->`

export const makePlan = (id: string, boundaryId: string | undefined): Runtime.LiveRegionPlan => ({
  id,
  boundaryId,
  startMarker: startMarker(id),
  endMarker: endMarker(id),
})

export const stripRuntimeManagedAttributes = (
  attributes: Readonly<Record<string, string>>,
): Record<string, string> => {
  const stripped: Record<string, string> = {}

  for (const [key, value] of Object.entries(attributes)) {
    if (!runtimeManagedAttributeNames.has(key)) {
      stripped[key] = value
    }
  }

  return stripped
}

const serializeAttributes = (attributes: Readonly<Record<string, string>>): string => {
  const entries = Object.entries(attributes)

  if (entries.length === 0) {
    return ""
  }

  return entries.map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`).join("")
}

export type UnsupportedReason = "nested-live" | "event-binding" | "hydration-boundary"

export type StaticSerializationResult =
  | {
    readonly _tag: "Supported"
    readonly html: string
  }
  | {
    readonly _tag: "Unsupported"
    readonly reason: UnsupportedReason
  }

export const collectLiveNodes = (node: LoomCore.Ast.Node): ReadonlyArray<LoomCore.Ast.LiveNode<unknown>> => {
  switch (node._tag) {
    case "Text":
      return []
    case "DynamicText":
      return []
    case "Live":
      return [node]
    case "ComponentUse":
      return collectLiveNodes(node.component.node)
    case "Fragment":
      return node.children.flatMap(collectLiveNodes)
    case "Element":
      return node.children.flatMap(collectLiveNodes)
  }
}

export const serializeStaticNode = (node: LoomCore.Ast.Node): StaticSerializationResult => {
  switch (node._tag) {
    case "Text":
      return {
        _tag: "Supported",
        html: escapeText(node.value),
      }
    case "DynamicText":
      return {
        _tag: "Supported",
        html: escapeText(String(node.render())),
      }
    case "ComponentUse":
      return serializeStaticNode(node.component.node)
    case "Live":
      return {
        _tag: "Unsupported",
        reason: "nested-live",
      }
    case "Fragment": {
      let html = ""

      for (const child of node.children) {
        const serialized = serializeStaticNode(child)

        if (serialized._tag === "Unsupported") {
          return serialized
        }

        html += serialized.html
      }

      return {
        _tag: "Supported",
        html,
      }
    }
    case "Element": {
      if (node.events.length > 0) {
        return {
          _tag: "Unsupported",
          reason: "event-binding",
        }
      }

      if (node.hydration !== undefined) {
        return {
          _tag: "Unsupported",
          reason: "hydration-boundary",
        }
      }

      let childrenHtml = ""

      for (const child of node.children) {
        const serialized = serializeStaticNode(child)

        if (serialized._tag === "Unsupported") {
          return serialized
        }

        childrenHtml += serialized.html
      }

      return {
        _tag: "Supported",
        html: `<${node.tagName}${
          serializeAttributes(stripRuntimeManagedAttributes(node.attributes))
        }>${childrenHtml}</${node.tagName}>`,
      }
    }
  }
}
