import * as LoomCore from "@effectify/loom-core"
import * as Hydration from "./hydration.js"
import type * as Html from "./html.js"
import * as internalApi from "./internal/api.js"
import * as viewNode from "./internal/view-node.js"

export type Renderable<E = never, R = never> = viewNode.Type & {
  readonly __error?: E
  readonly __requirements?: R
}

export type ErrorOfRenderable<Value> = Value extends { readonly __error?: infer Error } ? Error : never
export type RequirementsOfRenderable<Value> = Value extends { readonly __requirements?: infer Requirements }
  ? Requirements
  : never

export type PrimitiveInterpolation = string | number | bigint | null | undefined | false
export type TemplateValue =
  | LoomCore.Ast.Node
  | LoomCore.Component.Definition
  | PrimitiveInterpolation
  | ReadonlyArray<unknown>
export type TemplateInterpolation = TemplateValue | Hydration.Strategy | Html.EventHandler | (() => TemplateValue)

type InterpolationError<Value> = Value extends ReadonlyArray<infer Item> ? InterpolationError<Item>
  : Value extends () => infer Produced ? InterpolationError<Produced>
  : Value extends { readonly __error?: infer Error } ? Error
  : never

type InterpolationRequirements<Value> = Value extends ReadonlyArray<infer Item> ? InterpolationRequirements<Item>
  : Value extends () => infer Produced ? InterpolationRequirements<Produced>
  : Value extends { readonly __requirements?: infer Requirements } ? Requirements
  : never

const childMarkerPrefix = "loom-child:"
const attributeMarkerPrefix = "__loom_attr_"
const attributeMarkerPattern = /^__loom_attr_(\d+)__$/u
const commentNodeType = 8
const textNodeType = 3
const elementNodeType = 1
const attributeContextPattern = /[A-Za-z0-9_:-]+\s*=\s*$/u

const isRenderable = (value: unknown): value is Renderable<any, any> =>
  typeof value === "object" && value !== null && "_tag" in value &&
  (value as { readonly _tag: string })._tag !== "Component"

const isComponentDefinition = (value: unknown): value is { readonly _tag: "Component" } =>
  typeof value === "object" && value !== null && "_tag" in value &&
  (value as { readonly _tag: string })._tag === "Component"

const isEventHandler = (value: unknown): value is Html.EventHandler =>
  typeof value === "function" || (typeof value === "object" && value !== null)

const isTemplateThunk = (value: TemplateInterpolation): value is () => TemplateValue =>
  typeof value === "function" && value.length === 0

const isHydrationStrategy = (value: unknown): value is Hydration.Strategy =>
  typeof value === "object" && value !== null && "strategy" in value && "attributeName" in value &&
  "attributeValue" in value

const pushEventDirective = (
  directive: string,
  eventName: string,
  interpolation: TemplateInterpolation,
  events: Array<LoomCore.Ast.EventBinding>,
): void => {
  if (!isEventHandler(interpolation)) {
    throw new Error(`${directive} expects an event handler.`)
  }

  events.push(internalApi.makeEventBinding(eventName, interpolation))
}

const asRenderable = <E = never, R = never>(node: LoomCore.Ast.Node): Renderable<E, R> => viewNode.wrap(node)

const collapseNodes = (nodes: ReadonlyArray<LoomCore.Ast.Node>): LoomCore.Ast.Node => {
  if (nodes.length === 0) {
    return LoomCore.Ast.fragment([])
  }

  return nodes.length === 1 ? nodes[0] : LoomCore.Ast.fragment(nodes)
}

const normalizeStaticInterpolation = (value: TemplateValue): ReadonlyArray<LoomCore.Ast.Node> => {
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

const normalizeInterpolationValue = (value: TemplateInterpolation): ReadonlyArray<LoomCore.Ast.Node> => {
  if (isTemplateThunk(value)) {
    return [LoomCore.Ast.computed(() => collapseNodes(normalizeStaticInterpolation(value())))]
  }

  return normalizeStaticInterpolation(value as TemplateValue)
}

const assertTemplateValue = (value: unknown, owner: string): void => {
  if (isComponentDefinition(value)) {
    throw new Error(`${owner} is invalid in html templates. Use View.use(...) instead.`)
  }

  if (Array.isArray(value)) {
    throw new Error(`${owner} is invalid in html templates. Use View.for(...) instead.`)
  }
}

const parseAttributeMarker = (value: string): number | undefined => {
  const match = value.match(attributeMarkerPattern)
  return match === null ? undefined : Number(match[1])
}

const textToNode = (value: string): LoomCore.Ast.Node | undefined =>
  value.trim().length === 0 ? undefined : LoomCore.Ast.text(value)

const applyAttributeInterpolation = (
  name: string,
  interpolation: TemplateInterpolation,
  attributes: Record<string, string>,
  bindings: Array<LoomCore.Ast.ElementBinding>,
): void => {
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

const applyWebDirective = (
  name: string,
  interpolation: TemplateInterpolation,
  attributes: Record<string, string>,
  bindings: Array<LoomCore.Ast.ElementBinding>,
  events: Array<LoomCore.Ast.EventBinding>,
): LoomCore.Ast.HydrationMetadata | undefined => {
  switch (name) {
    case "click": {
      pushEventDirective("web:click", "click", interpolation, events)
      return undefined
    }
    case "input": {
      pushEventDirective("web:input", "input", interpolation, events)
      return undefined
    }
    case "submit": {
      pushEventDirective("web:submit", "submit", interpolation, events)
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

const isCommentNode = (node: ChildNode): node is Comment => node.nodeType === commentNodeType

const isTextNode = (node: ChildNode): node is Text => node.nodeType === textNodeType

const isElementNode = (node: ChildNode): node is HTMLElement => node.nodeType === elementNodeType

const convertDomNode = (
  node: ChildNode,
  values: ReadonlyArray<TemplateInterpolation>,
): ReadonlyArray<LoomCore.Ast.Node> => {
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

  const attributes: Record<string, string> = {}
  const bindings: Array<LoomCore.Ast.ElementBinding> = []
  const events: Array<LoomCore.Ast.EventBinding> = []
  let hydration: LoomCore.Ast.HydrationMetadata | undefined

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

  return [
    LoomCore.Ast.element(node.tagName.toLowerCase(), {
      attributes,
      bindings,
      children: Array.from(node.childNodes).flatMap((child) => convertDomNode(child, values)),
      events,
      hydration,
    }),
  ]
}

const createTemplateElement = (): HTMLTemplateElement => {
  if (typeof document === "undefined") {
    throw new Error("html template authoring currently requires DOM template parsing support.")
  }

  return document.createElement("template")
}

export const renderable = <E = never, R = never>(node: LoomCore.Ast.Node): Renderable<E, R> => asRenderable(node)

export const html = <const Values extends ReadonlyArray<TemplateInterpolation>>(
  strings: TemplateStringsArray,
  ...values: Values
): Renderable<InterpolationError<Values[number]>, InterpolationRequirements<Values[number]>> => {
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

  return asRenderable(
    collapseNodes(Array.from(template.content.childNodes).flatMap((child) => convertDomNode(child, values))),
  )
}
