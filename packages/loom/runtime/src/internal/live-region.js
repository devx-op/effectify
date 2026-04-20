import * as Hydration from "../hydration.js"
const escapeText = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
const escapeAttribute = (value) =>
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
export const startMarker = (id) => `${Hydration.liveMarkerPrefix}-start:${id}`
export const endMarker = (id) => `${Hydration.liveMarkerPrefix}-end:${id}`
export const wrapHtml = (id, html) => `<!--${startMarker(id)}-->${html}<!--${endMarker(id)}-->`
export const makePlan = (id, boundaryId) => ({
  id,
  boundaryId,
  startMarker: startMarker(id),
  endMarker: endMarker(id),
})
export const stripRuntimeManagedAttributes = (attributes) => {
  const stripped = {}
  for (const [key, value] of Object.entries(attributes)) {
    if (!runtimeManagedAttributeNames.has(key)) {
      stripped[key] = value
    }
  }
  return stripped
}
const serializeAttributes = (attributes) => {
  const entries = Object.entries(attributes)
  if (entries.length === 0) {
    return ""
  }
  return entries.map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`).join("")
}
export const collectLiveNodes = (node) => {
  switch (node._tag) {
    case "Text":
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
export const serializeStaticNode = (node) => {
  switch (node._tag) {
    case "Text":
      return {
        _tag: "Supported",
        html: escapeText(node.value),
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
