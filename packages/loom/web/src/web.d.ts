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
export declare const serializeClass: (value: ClassInput) => string
export declare const serializeStyle: (value: string | StyleRecord) => string
/** Override the root element tag for an element-backed view. Non-element nodes pass through unchanged. */
export declare const as: (tagName: RootTagName) => Modifier
/** Attach a CSS class to a view element. Non-element nodes pass through unchanged. */
export declare const className: (value: ReactiveInput<string>) => Modifier
/** Attach a DOM attribute to a view element. Non-element nodes pass through unchanged. */
export declare const attr: (name: string, value: ReactiveAttrValue) => Modifier
/** Attach multiple DOM attributes at once. */
export declare const attrs: (values: AttrRecord) => Modifier
/** Attach text-input value semantics using DOM property updates instead of plain attributes. */
export declare const value: (nextValue: ReactiveValueInput) => Modifier
/** Attach value semantics specifically for the current `View.input(...)` text-input slice. */
export declare const inputValue: (nextValue: ReactiveValueInput) => Modifier
/** Attach a data-* attribute. */
export declare const data: (name: string, value: ReactiveAttrValue) => Modifier
/** Attach an aria-* attribute. */
export declare const aria: (name: string, value: ReactiveAttrValue) => Modifier
/** Attach inline styles using a string or a style object. */
export declare const style: (value: ReactiveStyleInput) => Modifier
/** Attach hydration metadata to a view element. Non-element nodes pass through unchanged. */
export declare const hydrate: (strategy: Hydration.Strategy) => Modifier
/** Attach a click or DOM event handler to an element view. Non-element nodes pass through unchanged. */
export declare const on: <Target extends EventTarget = EventTarget, EventType extends Event = Event>(
  event: string,
  handler: Html.EventHandler<Target, EventType>,
) => Modifier
