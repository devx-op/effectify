import * as Hydration from "./hydration.js"
import * as internal from "./internal/view-node.js"
const isReactiveInput = (value) => typeof value === "function"
const toAttrValue = (value) => {
  if (value === undefined || value === null || value === false) {
    return undefined
  }
  return String(value)
}
const toKebabCase = (value) => value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
const serializeStyle = (value) => {
  if (typeof value === "string") {
    return value.trim()
  }
  return Object.entries(value)
    .flatMap(([key, entry]) => {
      if (entry === undefined || entry === null) {
        return []
      }
      return [`${toKebabCase(key)}:${entry}`]
    })
    .join(";")
}
const appendBinding = (view, binding) =>
  internal.mapElement(view, (element) => ({
    ...element,
    bindings: [...element.bindings, binding],
  }))
/** Attach a CSS class to a view element. Non-element nodes pass through unchanged. */
export const className = (value) =>
  isReactiveInput(value)
    ? (view) =>
      appendBinding(view, {
        _tag: "ClassBinding",
        render: () => value(),
      })
    : attr("class", value)
/** Attach a DOM attribute to a view element. Non-element nodes pass through unchanged. */
export const attr = (name, value) => (view) => {
  if (isReactiveInput(value)) {
    if (name === "class") {
      return appendBinding(view, {
        _tag: "ClassBinding",
        render: () => toAttrValue(value()),
      })
    }
    if (name === "style") {
      return appendBinding(view, {
        _tag: "StyleBinding",
        render: () => toAttrValue(value()),
      })
    }
    return appendBinding(view, {
      _tag: "AttrBinding",
      name,
      render: () => toAttrValue(value()),
    })
  }
  return internal.mapElement(view, (element) => {
    const attrValue = toAttrValue(value)
    if (attrValue === undefined) {
      return element
    }
    const nextValue = name === "class" && element.attributes.class !== undefined
      ? `${element.attributes.class} ${attrValue}`
      : name === "style" && element.attributes.style !== undefined
      ? `${element.attributes.style};${attrValue}`
      : attrValue
    return {
      ...element,
      attributes: {
        ...element.attributes,
        [name]: nextValue,
      },
    }
  })
}
/** Attach multiple DOM attributes at once. */
export const attrs = (values) => (view) =>
  Object.entries(values).reduce((currentView, [name, value]) => attr(name, value)(currentView), view)
/** Attach a data-* attribute. */
export const data = (name, value) => attr(`data-${name}`, value)
/** Attach an aria-* attribute. */
export const aria = (name, value) => attr(`aria-${name}`, value)
/** Attach inline styles using a string or a style object. */
export const style = (value) =>
  isReactiveInput(value)
    ? (view) =>
      appendBinding(view, {
        _tag: "StyleBinding",
        render: () => serializeStyle(value()),
      })
    : attr("style", serializeStyle(value))
/** Attach hydration metadata to a view element. Non-element nodes pass through unchanged. */
export const hydrate = (strategy) => (view) =>
  internal.mapElement(view, (element) => ({
    ...element,
    hydration: Hydration.boundary(strategy),
    attributes: {
      ...element.attributes,
      ...Hydration.boundary(strategy).attributes,
    },
  }))
/** Attach a click or DOM event handler to an element view. Non-element nodes pass through unchanged. */
export const on = (event, handler) => (view) =>
  internal.mapElement(view, (element) => ({
    ...element,
    events: [
      ...element.events,
      {
        _tag: "EventBinding",
        event,
        mode: typeof handler === "function" ? "contextual" : "effect",
        handler,
      },
    ],
  }))
