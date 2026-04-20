import type { Atom } from "effect/unstable/reactivity"
import * as LoomCore from "@effectify/loom-core"
import * as LoomRuntime from "@effectify/loom-runtime"
import type * as Component from "./component.js"
import type * as Diagnostics from "./diagnostics.js"
import * as Hydration from "./hydration.js"
/**
 * Compatibility-focused Html DSL and low-level AST / SSR seam.
 *
 * Prefer `View`, `Web`, `Slot`, and `mount` from the package root for new vNext
 * authoring. Keep `Html` for compatibility, renderer-adjacent primitives, and
 * advanced runtime handoff seams.
 */
/** Effect-only event handler form. */
export type SimpleHandler = LoomCore.Component.EffectLike
/** Contextual event handler form. */
export type ContextualHandler<Target extends EventTarget = EventTarget, EventType extends Event = Event> = (
  context: LoomRuntime.Runtime.EventContext<Target, EventType>,
) => unknown
/** Event handler contract supporting simple and contextual forms. */
export type EventHandler<Target extends EventTarget = EventTarget, EventType extends Event = Event> =
  | SimpleHandler
  | ContextualHandler<Target, EventType>
export type ReferencedEventHandler<Target extends EventTarget = EventTarget, EventType extends Event = Event> =
  LoomRuntime.Resumability.ReferencedHandler<EventHandler<Target, EventType>>
export interface EventBinding<Target extends EventTarget = EventTarget, EventType extends Event = Event>
  extends LoomRuntime.Runtime.EventBinding<EventHandler<Target, EventType>>
{
}
export interface SsrOptions extends LoomRuntime.Runtime.SsrOptions {
}
export interface SsrResult extends LoomRuntime.Runtime.SsrRenderResult {
  readonly diagnosticSummary: ReadonlyArray<Diagnostics.Summary>
}
export type Child = LoomCore.Ast.Node | Component.Type | string | ReadonlyArray<Child> | undefined | null | false
export interface AttributeModifier {
  readonly _tag: "AttributeModifier"
  readonly name: string
  readonly value: string
}
export interface ChildrenModifier {
  readonly _tag: "ChildrenModifier"
  readonly children: ReadonlyArray<Child>
}
export interface HydrationModifier {
  readonly _tag: "HydrationModifier"
  readonly metadata: LoomCore.Ast.HydrationMetadata
}
export interface EventModifier<Target extends EventTarget = EventTarget, EventType extends Event = Event> {
  readonly _tag: "EventModifier"
  readonly binding: EventBinding<Target, EventType>
}
export type ElementModifier = AttributeModifier | ChildrenModifier | HydrationModifier | EventModifier
/** Create a low-level neutral text node for the compatibility Html seam. */
export declare const text: (value: string) => LoomCore.Ast.TextNode
/** Create a low-level neutral fragment node for the compatibility Html seam. */
export declare const fragment: (...nodes: ReadonlyArray<Child>) => LoomCore.Ast.FragmentNode
/** Add children to an element. */
export declare const children: (...nodes: ReadonlyArray<Child>) => ChildrenModifier
/** Add a plain string attribute to an element. */
export declare const attr: (name: string, value: string) => AttributeModifier
/** Add or extend an element class attribute. */
export declare const className: (value: string) => AttributeModifier
/** Create a low-level neutral element node. Prefer `View` + `Web` for new root happy-path authoring. */
export declare const el: (tagName: string, ...modifiers: ReadonlyArray<ElementModifier>) => LoomCore.Ast.ElementNode
/** Backwards-compatible alias for the earlier scaffolding API. Prefer `Html.el(...)` or the root `View` / `Web` surface. */
export declare const element: (
  tagName: string,
  ...modifiers: ReadonlyArray<ElementModifier>
) => LoomCore.Ast.ElementNode
/** Create a live Atom bridge over the Loom neutral AST. */
export declare const live: <Value>(
  atom: Atom.Atom<Value>,
  render: ((value: Value) => Child) | LoomRuntime.Resumability.ReferencedLiveRegion<Value>,
) => LoomCore.Ast.LiveNode<Value>
/** Mark a low-level Html element as hydratable under a given strategy. */
export declare const hydrate: (strategy: Hydration.Strategy) => HydrationModifier
/** Create a low-level event binding descriptor for DOM/runtime interoperability. */
export declare const on: <Target extends EventTarget = EventTarget, EventType extends Event = Event>(
  event: string,
  handler: EventHandler<Target, EventType> | ReferencedEventHandler<Target, EventType>,
) => EventModifier<Target, EventType>
/** Serialize the current Loom tree to SSR HTML plus explicit runtime metadata for advanced compatibility flows. */
export declare const ssr: (root: Child, options?: SsrOptions) => SsrResult
/** Serialize the current Loom tree to SSR HTML only through the low-level Html seam. */
export declare const renderToString: (root: Child, options?: SsrOptions) => string
