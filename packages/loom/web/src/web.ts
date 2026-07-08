import type * as LoomCore from "@effectify/loom-core"
import type * as Html from "./html.js"
import * as Hydration from "./hydration.js"
import * as internal from "./internal/view-node.js"

export type Modifier = (view: internal.Type) => internal.Type
export type RootTagName = string
export type AttrValue = string | number | boolean | null | undefined
export type ReactiveInput<Value> = Value | (() => Value)
export type ReactiveAttrValue = ReactiveInput<AttrValue>
export type ValueInput = string | number | null | undefined
export type ReactiveValueInput = ReactiveInput<ValueInput>
export type AttrRecord = Readonly<Record<string, ReactiveAttrValue>>
export type ClassToken = string | false | null | undefined
export type ClassInput = string | ReadonlyArray<ClassToken>
export type StyleValue = string | number | null | undefined
export type StyleRecord = Readonly<Record<string, StyleValue>>
export type StyleInput = string | StyleRecord
export type ReactiveStyleInput = ReactiveInput<StyleInput>

const isReactiveInput = <Value>(value: ReactiveInput<Value>): value is () => Value => typeof value === "function"

const toAttrValue = (value: AttrValue): string | undefined => {
  if (value === undefined || value === null || value === false) {
    return undefined
  }

  return String(value)
}

const toValueInput = (value: ValueInput): string | undefined => {
  if (value === undefined || value === null) {
    return undefined
  }

  return String(value)
}

const toKebabCase = (value: string): string => value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)

const normalizeClassToken = (value: ClassToken): string | undefined => {
  if (typeof value !== "string") {
    return undefined
  }

  const token = value.trim()
  return token.length === 0 ? undefined : token
}

export const serializeClass = (value: ClassInput): string => {
  if (typeof value === "string") {
    return value.trim()
  }

  return value
    .flatMap((entry) => {
      const token = normalizeClassToken(entry)
      return token === undefined ? [] : [token]
    })
    .join(" ")
}

export const serializeStyle = (value: string | StyleRecord): string => {
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

const appendBinding = (
  view: internal.Type,
  binding: LoomCore.Ast.ElementBinding,
): internal.Type =>
  internal.mapElement(view, (element) => ({
    ...element,
    bindings: [...element.bindings, binding],
  }))

/** Override the root element tag for an element-backed view. Non-element nodes pass through unchanged. */
export const as = (tagName: RootTagName): Modifier => (view) =>
  internal.mapElement(view, (element) => ({
    ...element,
    tagName,
  }))

/** Attach a CSS class to a view element. Non-element nodes pass through unchanged. */
export const className = (value: ReactiveInput<string>): Modifier =>
  isReactiveInput(value)
    ? (view) =>
      appendBinding(view, {
        _tag: "ClassBinding",
        render: () => value(),
      })
    : attr("class", value)

/** Attach a DOM attribute to a view element. Non-element nodes pass through unchanged. */
export const attr = (name: string, value: ReactiveAttrValue): Modifier => (view) => {
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
export const attrs = (values: AttrRecord): Modifier => (view) =>
  Object.entries(values).reduce(
    (currentView, [name, value]) => attr(name, value)(currentView),
    view,
  )

/** Attach text-input value semantics using DOM property updates instead of plain attributes. */
export const value = (nextValue: ReactiveValueInput): Modifier => (view) => {
  if (isReactiveInput(nextValue)) {
    return appendBinding(view, {
      _tag: "ValueBinding",
      render: () => toValueInput(nextValue()),
    })
  }

  return internal.mapElement(view, (element) => {
    const value = toValueInput(nextValue)

    if (value === undefined) {
      return element
    }

    return {
      ...element,
      attributes: {
        ...element.attributes,
        value,
      },
    }
  })
}

/** Attach value semantics specifically for the current `View.input(...)` text-input slice. */
export const inputValue = (nextValue: ReactiveValueInput): Modifier => value(nextValue)

/** Attach a data-* attribute. */
export const data = (name: string, value: ReactiveAttrValue): Modifier => attr(`data-${name}`, value)

/** Attach an aria-* attribute. */
export const aria = (name: string, value: ReactiveAttrValue): Modifier => attr(`aria-${name}`, value)

/** Attach inline styles using a string or a style object. */
export const style = (value: ReactiveStyleInput): Modifier =>
  isReactiveInput(value)
    ? (view) =>
      appendBinding(view, {
        _tag: "StyleBinding",
        render: () => serializeStyle(value()),
      })
    : attr("style", serializeStyle(value))

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
