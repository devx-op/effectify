import * as LoomCore from "@effectify/loom-core"
import * as Hydration from "./hydration.js"
import type * as Html from "./html.js"
import * as internalApi from "./internal/api.js"
import { isStateAccessor, type StateAccessor } from "./internal/tracked-state.js"
import * as viewNode from "./internal/view-node.js"
import * as Web from "./web.js"

export type Renderable<E = never, R = never> = viewNode.Type & {
  readonly __error?: E
  readonly __requirements?: R
}

export type ErrorOfRenderable<Value> = Value extends { readonly __error?: infer Error } ? Error : never
export type RequirementsOfRenderable<Value> = Value extends { readonly __requirements?: infer Requirements }
  ? Requirements
  : never

export type PrimitiveInterpolation = string | number | bigint | null | undefined | false
export type TemplateDirectiveValue = Web.ClassInput | Web.StyleInput
export type TemplateValue =
  | LoomCore.Ast.Node
  | LoomCore.Component.Definition
  | PrimitiveInterpolation
  | ReadonlyArray<unknown>
export type TemplateInterpolation =
  | TemplateValue
  | TemplateDirectiveValue
  | Hydration.Strategy
  | Html.EventHandler
  | StateAccessor<TemplateValue | TemplateDirectiveValue>
  | (() => TemplateValue | TemplateDirectiveValue)

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
const attributeContextPattern = /[A-Za-z0-9_:-]+\s*=\s*$/u

type ParsedAttribute = {
  readonly name: string
  readonly value: string
}

type ParsedCommentNode = {
  readonly kind: "comment"
  readonly data: string
}

type ParsedTextNode = {
  readonly kind: "text"
  readonly data: string
}

type ParsedElementNode = {
  readonly kind: "element"
  readonly tagName: string
  readonly attributes: ReadonlyArray<ParsedAttribute>
  readonly children: ReadonlyArray<ParsedNode>
}

type ParsedNode = ParsedCommentNode | ParsedTextNode | ParsedElementNode

const htmlVoidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
])

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

const isTemplateAccessor = (
  value: TemplateInterpolation,
): value is StateAccessor<TemplateValue | TemplateDirectiveValue> => isStateAccessor(value)

const isZeroArgFunction = (value: unknown): value is () => unknown => typeof value === "function" && value.length === 0

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

type TemplateClassInput = Web.ClassInput

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

const templateDirectiveError = (name: "class" | "style", detail: string): Error =>
  new Error(`web:${name} expects ${detail}.`)

const normalizeClassDirectiveValue = (value: unknown): string | undefined => {
  if (value === null || value === undefined || value === false) {
    return undefined
  }

  if (typeof value === "string") {
    return Web.serializeClass(value)
  }

  if (Array.isArray(value)) {
    if (
      !value.every((entry) => entry === false || entry === null || entry === undefined || typeof entry === "string")
    ) {
      throw templateDirectiveError("class", "a string or a flat readonly array of string | false | null | undefined")
    }

    return Web.serializeClass(value as TemplateClassInput)
  }

  throw templateDirectiveError("class", "a string or a flat readonly array of string | false | null | undefined")
}

const isStyleRecord = (value: unknown): value is Web.StyleRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value) &&
  Object.values(value).every((entry) =>
    entry === null || entry === undefined || typeof entry === "string" || typeof entry === "number"
  )

const normalizeStyleDirectiveValue = (value: unknown): string | undefined => {
  if (value === null || value === undefined || value === false) {
    return undefined
  }

  if (typeof value === "string") {
    return Web.serializeStyle(value)
  }

  if (isStyleRecord(value)) {
    return Web.serializeStyle(value)
  }

  throw templateDirectiveError("style", "a string or a style object record")
}

const validateDirectiveThunk = (name: "class" | "style", value: unknown): (() => unknown) | undefined => {
  if (value === null || value === undefined || value === false) {
    return undefined
  }

  if (isStateAccessor(value)) {
    return value
  }

  if (isZeroArgFunction(value)) {
    return value
  }

  if (typeof value === "function") {
    throw templateDirectiveError(name, "a string or a zero-arg thunk")
  }

  return undefined
}

const applyClassDirective = (
  interpolation: TemplateInterpolation,
  attributes: Record<string, string>,
  bindings: Array<LoomCore.Ast.ElementBinding>,
): void => {
  const thunk = validateDirectiveThunk("class", interpolation)

  if (thunk !== undefined) {
    bindings.push({
      _tag: "ClassBinding",
      render: () => normalizeClassDirectiveValue(thunk()),
    })
    return
  }

  const nextClass = normalizeClassDirectiveValue(interpolation)

  if (nextClass === undefined) {
    return
  }

  attributes.class = attributes.class === undefined
    ? nextClass
    : Web.serializeClass([attributes.class, nextClass])
}

const applyStyleDirective = (
  interpolation: TemplateInterpolation,
  attributes: Record<string, string>,
  bindings: Array<LoomCore.Ast.ElementBinding>,
): void => {
  const thunk = validateDirectiveThunk("style", interpolation)

  if (thunk !== undefined) {
    bindings.push({
      _tag: "StyleBinding",
      render: () => normalizeStyleDirectiveValue(thunk()),
    })
    return
  }

  const nextStyle = normalizeStyleDirectiveValue(interpolation)

  if (nextStyle === undefined) {
    return
  }

  attributes.style = attributes.style === undefined
    ? nextStyle
    : [attributes.style, nextStyle]
      .map((value) => value.trim().replace(/;+$/u, ""))
      .filter((value) => value.length > 0)
      .join(";")
}

const normalizeInterpolationValue = (value: TemplateInterpolation): ReadonlyArray<LoomCore.Ast.Node> => {
  if (isTemplateAccessor(value)) {
    return [LoomCore.Ast.computed(() => collapseNodes(normalizeStaticInterpolation(value() as TemplateValue)))]
  }

  if (isTemplateThunk(value)) {
    return [LoomCore.Ast.computed(() => collapseNodes(normalizeStaticInterpolation(value())))]
  }

  return normalizeStaticInterpolation(value as TemplateValue)
}

const assertTemplateValue = (value: unknown, owner: string): void => {
  if (isComponentDefinition(value)) {
    throw new Error(
      `${owner} is invalid in html templates. Use View.of(...) for simple components or View.use(...) for props, children, or slots.`,
    )
  }

  if (Array.isArray(value)) {
    throw new Error(`${owner} is invalid in html templates. Use View.for(...) instead.`)
  }
}

const parseAttributeMarker = (value: string): number | undefined => {
  const match = value.match(attributeMarkerPattern)
  return match === null ? undefined : Number(match[1])
}

const isWhitespace = (character: string | undefined): boolean => character !== undefined && /\s/u.test(character)

const skipWhitespace = (source: string, start: number): number => {
  let cursor = start

  while (isWhitespace(source[cursor])) {
    cursor += 1
  }

  return cursor
}

const readName = (source: string, start: number, owner: string): readonly [string, number] => {
  let cursor = start

  while (cursor < source.length) {
    const character = source[cursor]

    if (
      character === undefined ||
      isWhitespace(character) ||
      character === "/" ||
      character === ">" ||
      character === "="
    ) {
      break
    }

    cursor += 1
  }

  if (cursor === start) {
    throw new Error(`Invalid html template: expected ${owner}.`)
  }

  return [source.slice(start, cursor), cursor]
}

const readAttributeValue = (source: string, start: number): readonly [string, number] => {
  const quote = source[start]

  if (quote === '"' || quote === "'") {
    const end = source.indexOf(quote, start + 1)

    if (end === -1) {
      throw new Error("Invalid html template: unterminated quoted attribute value.")
    }

    return [source.slice(start + 1, end), end + 1]
  }

  let cursor = start

  while (cursor < source.length) {
    const character = source[cursor]

    if (character === undefined || isWhitespace(character) || character === "/" || character === ">") {
      break
    }

    cursor += 1
  }

  return [source.slice(start, cursor), cursor]
}

const parseStartTag = (
  source: string,
  start: number,
): readonly [ParsedElementNode, number, boolean] => {
  const [tagName, tagCursor] = readName(source, start + 1, "an element tag name")
  let cursor = tagCursor
  const attributes: Array<ParsedAttribute> = []
  let selfClosing = false

  while (cursor < source.length) {
    cursor = skipWhitespace(source, cursor)

    if (source.startsWith("/>", cursor)) {
      selfClosing = true
      cursor += 2
      break
    }

    if (source[cursor] === ">") {
      cursor += 1
      break
    }

    const [attributeName, attributeCursor] = readName(source, cursor, "an attribute name")
    cursor = skipWhitespace(source, attributeCursor)
    let value = ""

    if (source[cursor] === "=") {
      cursor = skipWhitespace(source, cursor + 1)
      ;[value, cursor] = readAttributeValue(source, cursor)
    }

    attributes.push({
      name: attributeName,
      value,
    })
  }

  return [{ kind: "element", tagName: tagName.toLowerCase(), attributes, children: [] }, cursor, selfClosing]
}

const parseTemplateSource = (source: string): ReadonlyArray<ParsedNode> => {
  const root: { readonly children: Array<ParsedNode> } = { children: [] }
  const stack: Array<{ readonly tagName: string; readonly children: Array<ParsedNode> }> = [{
    tagName: "#root",
    children: root.children,
  }]
  let cursor = 0

  while (cursor < source.length) {
    const current = stack[stack.length - 1]

    if (source.startsWith("<!--", cursor)) {
      const commentEnd = source.indexOf("-->", cursor + 4)

      if (commentEnd === -1) {
        throw new Error("Invalid html template: unterminated comment.")
      }

      current.children.push({
        kind: "comment",
        data: source.slice(cursor + 4, commentEnd),
      })
      cursor = commentEnd + 3
      continue
    }

    if (source[cursor] === "<") {
      if (source.startsWith("</", cursor)) {
        const [tagName, tagCursor] = readName(source, cursor + 2, "a closing tag name")
        cursor = skipWhitespace(source, tagCursor)

        if (source[cursor] !== ">") {
          throw new Error("Invalid html template: malformed closing tag.")
        }

        if (stack.length === 1) {
          throw new Error(`Invalid html template: unexpected closing tag </${tagName}>.`)
        }

        const closingTagName = tagName.toLowerCase()
        const openElement = stack[stack.length - 1]

        if (openElement.tagName !== closingTagName) {
          throw new Error(`Invalid html template: expected </${openElement.tagName}> but found </${closingTagName}>.`)
        }

        stack.pop()
        cursor += 1
        continue
      }

      const [element, nextCursor, explicitSelfClosing] = parseStartTag(source, cursor)
      current.children.push(element)
      cursor = nextCursor

      if (!explicitSelfClosing && !htmlVoidElements.has(element.tagName)) {
        stack.push({
          tagName: element.tagName,
          children: element.children as Array<ParsedNode>,
        })
      }

      continue
    }

    const nextTagIndex = source.indexOf("<", cursor)
    const textEnd = nextTagIndex === -1 ? source.length : nextTagIndex
    current.children.push({
      kind: "text",
      data: source.slice(cursor, textEnd),
    })
    cursor = textEnd
  }

  if (stack.length !== 1) {
    throw new Error(`Invalid html template: missing closing tag for <${stack[stack.length - 1].tagName}>.`)
  }

  return root.children
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

  if (isTemplateAccessor(interpolation) || isTemplateThunk(interpolation)) {
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
    case "class": {
      applyClassDirective(interpolation, attributes, bindings)
      return undefined
    }
    case "style": {
      applyStyleDirective(interpolation, attributes, bindings)
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

const convertParsedNode = (
  node: ParsedNode,
  values: ReadonlyArray<TemplateInterpolation>,
): ReadonlyArray<LoomCore.Ast.Node> => {
  if (node.kind === "comment") {
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

  if (node.kind === "text") {
    const textNode = textToNode(node.data)
    return textNode === undefined ? [] : [textNode]
  }

  const attributes: Record<string, string> = {}
  const bindings: Array<LoomCore.Ast.ElementBinding> = []
  const events: Array<LoomCore.Ast.EventBinding> = []
  let hydration: LoomCore.Ast.HydrationMetadata | undefined

  for (const attribute of node.attributes) {
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
      children: node.children.flatMap((child) => convertParsedNode(child, values)),
      events,
      hydration,
    }),
  ]
}

export const renderable = <E = never, R = never>(node: LoomCore.Ast.Node): Renderable<E, R> => asRenderable(node)

export const html = <const Values extends ReadonlyArray<TemplateInterpolation>>(
  strings: TemplateStringsArray,
  ...values: Values
): Renderable<InterpolationError<Values[number]>, InterpolationRequirements<Values[number]>> => {
  const source = strings.reduce((current, segment, index) => {
    if (index >= values.length) {
      return current + segment
    }

    const marker = attributeContextPattern.test(segment)
      ? `${attributeMarkerPrefix}${index}__`
      : `<!--${childMarkerPrefix}${index}-->`

    return current + segment + marker
  }, "")

  return asRenderable(
    collapseNodes(parseTemplateSource(source).flatMap((child) => convertParsedNode(child, values))),
  )
}
