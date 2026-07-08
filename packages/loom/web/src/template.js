import * as LoomCore from "@effectify/loom-core"
import * as Hydration from "./hydration.js"
import * as internalApi from "./internal/api.js"
import * as viewNode from "./internal/view-node.js"
import * as Web from "./web.js"

const childMarkerPrefix = "loom-child:"
const attributeMarkerPrefix = "__loom_attr_"
const attributeMarkerPattern = /^__loom_attr_(\d+)__$/u
const attributeContextPattern = /[A-Za-z0-9_:-]+\s*=\s*$/u
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

const isRenderable = (value) =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag !== "Component"
const isComponentDefinition = (value) => typeof value === "object" && value !== null && value._tag === "Component"
const isEventHandler = (value) => typeof value === "function" || (typeof value === "object" && value !== null)
const isTemplateThunk = (value) => typeof value === "function" && value.length === 0
const isZeroArgFunction = (value) => typeof value === "function" && value.length === 0
const isHydrationStrategy = (value) =>
  typeof value === "object" && value !== null && "strategy" in value && "attributeName" in value &&
  "attributeValue" in value

const pushEventDirective = (directive, eventName, interpolation, events) => {
  if (!isEventHandler(interpolation)) {
    throw new Error(`${directive} expects an event handler.`)
  }

  events.push(internalApi.makeEventBinding(eventName, interpolation))
}

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

const templateDirectiveError = (name, detail) => new Error(`web:${name} expects ${detail}.`)

const normalizeClassDirectiveValue = (value) => {
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
    return Web.serializeClass(value)
  }
  throw templateDirectiveError("class", "a string or a flat readonly array of string | false | null | undefined")
}

const isStyleRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value) &&
  Object.values(value).every((entry) =>
    entry === null || entry === undefined || typeof entry === "string" || typeof entry === "number"
  )

const normalizeStyleDirectiveValue = (value) => {
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

const validateDirectiveThunk = (name, value) => {
  if (value === null || value === undefined || value === false) {
    return undefined
  }
  if (isZeroArgFunction(value)) {
    return value
  }
  if (typeof value === "function") {
    throw templateDirectiveError(name, "a string or a zero-arg thunk")
  }
  return undefined
}

const applyClassDirective = (interpolation, attributes, bindings) => {
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

const applyStyleDirective = (interpolation, attributes, bindings) => {
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

const normalizeInterpolationValue = (value) => {
  if (isTemplateThunk(value)) {
    return [LoomCore.Ast.computed(() => collapseNodes(normalizeStaticInterpolation(value())))]
  }

  return normalizeStaticInterpolation(value)
}

const assertTemplateValue = (value, owner) => {
  if (isComponentDefinition(value)) {
    throw new Error(
      `${owner} is invalid in html templates. Use View.of(...) for simple components or View.use(...) for props, children, or slots.`,
    )
  }

  if (Array.isArray(value)) {
    throw new Error(`${owner} is invalid in html templates. Use View.for(...) instead.`)
  }
}

const parseAttributeMarker = (value) => {
  const match = value.match(attributeMarkerPattern)
  return match === null ? undefined : Number(match[1])
}

const isWhitespace = (character) => character !== undefined && /\s/u.test(character)

const skipWhitespace = (source, start) => {
  let cursor = start

  while (isWhitespace(source[cursor])) {
    cursor += 1
  }

  return cursor
}

const readName = (source, start, owner) => {
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

const readAttributeValue = (source, start) => {
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

const parseStartTag = (source, start) => {
  const [tagName, tagCursor] = readName(source, start + 1, "an element tag name")
  let cursor = tagCursor
  const attributes = []
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

    attributes.push({ name: attributeName, value })
  }

  return [{ kind: "element", tagName: tagName.toLowerCase(), attributes, children: [] }, cursor, selfClosing]
}

const parseTemplateSource = (source) => {
  const root = { children: [] }
  const stack = [{ tagName: "#root", children: root.children }]
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
        stack.push({ tagName: element.tagName, children: element.children })
      }

      continue
    }

    const nextTagIndex = source.indexOf("<", cursor)
    const textEnd = nextTagIndex === -1 ? source.length : nextTagIndex
    current.children.push({ kind: "text", data: source.slice(cursor, textEnd) })
    cursor = textEnd
  }

  if (stack.length !== 1) {
    throw new Error(`Invalid html template: missing closing tag for <${stack[stack.length - 1].tagName}>.`)
  }

  return root.children
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

const convertParsedNode = (node, values) => {
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

  const attributes = {}
  const bindings = []
  const events = []
  let hydration

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

  return [LoomCore.Ast.element(node.tagName.toLowerCase(), {
    attributes,
    bindings,
    children: node.children.flatMap((child) => convertParsedNode(child, values)),
    events,
    hydration,
  })]
}

export const renderable = (node) => viewNode.wrap(node)

export const html = (strings, ...values) => {
  const source = strings.reduce((current, segment, index) => {
    if (index >= values.length) {
      return current + segment
    }

    const marker = attributeContextPattern.test(segment)
      ? `${attributeMarkerPrefix}${index}__`
      : `<!--${childMarkerPrefix}${index}-->`

    return current + segment + marker
  }, "")

  return renderable(
    collapseNodes(parseTemplateSource(source).flatMap((child) => convertParsedNode(child, values))),
  )
}
