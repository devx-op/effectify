import type * as Html from "./html.js"
import * as Hydration from "./hydration.js"
import * as internal from "./internal/view-node.js"

export type Modifier = (view: internal.Type) => internal.Type
export type AttrValue = string | number | boolean | null | undefined
export type AttrRecord = Readonly<Record<string, AttrValue>>
export type StyleValue = string | number | null | undefined
export type StyleRecord = Readonly<Record<string, StyleValue>>

const toAttrValue = (value: AttrValue): string | undefined => {
  if (value === undefined || value === null || value === false) {
    return undefined
  }

  return String(value)
}

const toKebabCase = (value: string): string => value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)

const serializeStyle = (value: string | StyleRecord): string => {
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

/** Attach a CSS class to a view element. Non-element nodes pass through unchanged. */
export const className = (value: string): Modifier => attr("class", value)

/** Attach a DOM attribute to a view element. Non-element nodes pass through unchanged. */
export const attr = (name: string, value: AttrValue): Modifier => (view) =>
  internal.mapElement(view, (element) => {
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

/** Attach multiple DOM attributes at once. */
export const attrs = (values: AttrRecord): Modifier => (view) =>
  Object.entries(values).reduce(
    (currentView, [name, value]) => attr(name, value)(currentView),
    view,
  )

/** Attach a data-* attribute. */
export const data = (name: string, value: AttrValue): Modifier => attr(`data-${name}`, value)

/** Attach an aria-* attribute. */
export const aria = (name: string, value: AttrValue): Modifier => attr(`aria-${name}`, value)

/** Attach inline styles using a string or a style object. */
export const style = (value: string | StyleRecord): Modifier => attr("style", serializeStyle(value))

/** Attach hydration metadata to a view element. Non-element nodes pass through unchanged. */
export const hydrate = (strategy: Hydration.Strategy): Modifier => (view) =>
  internal.mapElement(view, (element) => ({
    ...element,
    hydration: Hydration.boundary(strategy),
    attributes: {
      ...element.attributes,
      ...Hydration.boundary(strategy).attributes,
    },
  }))

/** Attach a click or DOM event handler to an element view. Non-element nodes pass through unchanged. */
export const on = <Target extends EventTarget = EventTarget, EventType extends Event = Event>(
  event: string,
  handler: Html.EventHandler<Target, EventType>,
): Modifier =>
(view) =>
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
