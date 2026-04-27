import * as LoomCore from "@effectify/loom-core"
import * as Hydration from "./hydration.js"
import * as internalApi from "./internal/api.js"
import * as viewNode from "./internal/view-node.js"

const childMarkerPrefix = "loom-child:"
const attributeMarkerPrefix = "__loom_attr_"
const attributeMarkerPattern = /^__loom_attr_(\d+)__$/u
const attributeContextPattern = /[A-Za-z0-9_:-]+\s*=\s*$/u
const commentNodeType = 8
const textNodeType = 3
const elementNodeType = 1

const isRenderable = (value) =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag !== "Component"
const isComponentDefinition = (value) => typeof value === "object" && value !== null && value._tag === "Component"
const isEventHandler = (value) => typeof value === "function" || (typeof value === "object" && value !== null)
const isTemplateThunk = (value) => typeof value === "function" && value.length === 0
const isHydrationStrategy = (value) =>
  typeof value === "object" && value !== null && "strategy" in value && "attributeName" in value &&
  "attributeValue" in value

const collapseNodes = (nodes) => {
  if (nodes.length === 0) {
    return LoomCore.Ast.fragment([])
  }

  return nodes.length === 1 ? nodes[0] : LoomCore.Ast.fragment(nodes)
}

const normalizeStaticInterpolation = (value) => {
  if (value === null || value === undefined || value === false) {
    return []
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    return [LoomCore.Ast.text(String(value))]
  }

  if (isRenderable(value)) {
    return [value]
  }

  return []
}

const normalizeInterpolationValue = (value) => {
  if (isTemplateThunk(value)) {
    return [LoomCore.Ast.computed(() => collapseNodes(normalizeStaticInterpolation(value())))]
  }

  return normalizeStaticInterpolation(value)
}

const assertTemplateValue = (value, owner) => {
  if (isComponentDefinition(value)) {
    throw new Error(`${owner} is invalid in html templates. Use View.use(...) instead.`)
  }

  if (Array.isArray(value)) {
    throw new Error(`${owner} is invalid in html templates. Use View.for(...) instead.`)
  }
}

const parseAttributeMarker = (value) => {
  const match = value.match(attributeMarkerPattern)
  return match === null ? undefined : Number(match[1])
}

const textToNode = (value) => value.trim().length === 0 ? undefined : LoomCore.Ast.text(value)

const applyAttributeInterpolation = (name, interpolation, attributes, bindings) => {
  assertTemplateValue(interpolation, "Direct array/component interpolation")

  if (isTemplateThunk(interpolation)) {
    if (name === "value") {
      bindings.push({
        _tag: "ValueBinding",
        render: () => {
          const value = interpolation()
          return value === null || value === undefined ? undefined : String(value)
        },
      })
      return
    }

    if (name === "class") {
      bindings.push({
        _tag: "ClassBinding",
        render: () => {
          const value = interpolation()
          return value === null || value === undefined || value === false ? undefined : String(value)
        },
      })
      return
    }

    if (name === "style") {
      bindings.push({
        _tag: "StyleBinding",
        render: () => {
          const value = interpolation()
          return value === null || value === undefined || value === false ? undefined : String(value)
        },
      })
      return
    }

    bindings.push({
      _tag: "AttrBinding",
      name,
      render: () => {
        const value = interpolation()
        return value === null || value === undefined || value === false ? undefined : String(value)
      },
    })
    return
  }

  if (interpolation === null || interpolation === undefined || interpolation === false) {
    return
  }

  if (typeof interpolation === "string" || typeof interpolation === "number" || typeof interpolation === "bigint") {
    attributes[name] = String(interpolation)
    return
  }

  throw new Error(`Attribute interpolation for '${name}' must be a primitive or thunk.`)
}

const applyWebDirective = (name, interpolation, attributes, bindings, events) => {
  switch (name) {
    case "click": {
      if (!isEventHandler(interpolation)) {
        throw new Error("web:click expects an event handler.")
      }

      events.push(internalApi.makeEventBinding("click", interpolation))
      return undefined
    }
    case "value":
    case "inputValue": {
      applyAttributeInterpolation("value", interpolation, attributes, bindings)
      return undefined
    }
    case "hydrate": {
      if (!isHydrationStrategy(interpolation)) {
        throw new Error("web:hydrate expects an explicit Hydration.strategy helper value.")
      }

      const hydration = Hydration.boundary(interpolation)
      Object.assign(attributes, hydration.attributes)
      return hydration
    }
    default:
      throw new Error(`Unsupported template directive 'web:${name}'.`)
  }
}

const isCommentNode = (node) => node.nodeType === commentNodeType
const isTextNode = (node) => node.nodeType === textNodeType
const isElementNode = (node) => node.nodeType === elementNodeType

const convertDomNode = (node, values) => {
  if (isCommentNode(node)) {
    if (!node.data.startsWith(childMarkerPrefix)) {
      return []
    }

    const index = Number(node.data.slice(childMarkerPrefix.length))
    const interpolation = values[index]

    if (interpolation === undefined) {
      return []
    }

    assertTemplateValue(interpolation, "Direct array/component interpolation")
    return normalizeInterpolationValue(interpolation)
  }

  if (isTextNode(node)) {
    const textNode = textToNode(node.data)
    return textNode === undefined ? [] : [textNode]
  }

  if (!isElementNode(node)) {
    return []
  }

  const attributes = {}
  const bindings = []
  const events = []
  let hydration

  for (const attribute of Array.from(node.attributes)) {
    const interpolationIndex = parseAttributeMarker(attribute.value)

    if (attribute.name.startsWith("web:")) {
      if (interpolationIndex === undefined) {
        throw new Error(`Directive '${attribute.name}' expects an interpolated value.`)
      }

      const interpolation = values[interpolationIndex]

      if (interpolation === undefined) {
        continue
      }

      hydration = applyWebDirective(attribute.name.slice(4), interpolation, attributes, bindings, events) ?? hydration
      continue
    }

    if (interpolationIndex === undefined) {
      attributes[attribute.name] = attribute.value
      continue
    }

    const interpolation = values[interpolationIndex]

    if (interpolation === undefined) {
      continue
    }

    applyAttributeInterpolation(attribute.name, interpolation, attributes, bindings)
  }

  return [LoomCore.Ast.element(node.tagName.toLowerCase(), {
    attributes,
    bindings,
    children: Array.from(node.childNodes).flatMap((child) => convertDomNode(child, values)),
    events,
    hydration,
  })]
}

const createTemplateElement = () => {
  if (typeof document === "undefined") {
    throw new Error("html template authoring currently requires DOM template parsing support.")
  }

  return document.createElement("template")
}

export const renderable = (node) => viewNode.wrap(node)

export const html = (strings, ...values) => {
  for (const value of values) {
    assertTemplateValue(value, "Direct array/component interpolation")
  }

  const source = strings.reduce((current, segment, index) => {
    if (index >= values.length) {
      return current + segment
    }

    const marker = attributeContextPattern.test(segment)
      ? `${attributeMarkerPrefix}${index}__`
      : `<!--${childMarkerPrefix}${index}-->`

    return current + segment + marker
  }, "")

  const template = createTemplateElement()
  template.innerHTML = source

  return renderable(
    collapseNodes(Array.from(template.content.childNodes).flatMap((child) => convertDomNode(child, values))),
  )
}
