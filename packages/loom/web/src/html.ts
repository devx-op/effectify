import type { Atom } from "effect/unstable/reactivity"
import * as LoomCore from "@effectify/loom-core"
import * as LoomRuntime from "@effectify/loom-runtime"
import type * as Component from "./component.js"
import type * as Diagnostics from "./diagnostics.js"
import * as Hydration from "./hydration.js"
import * as internal from "./internal/api.js"

/** Effect-only event handler form. */
export type SimpleHandler = LoomCore.Component.EffectLike

/** Contextual event handler form. */
export type ContextualHandler<
  Target extends EventTarget = EventTarget,
  EventType extends Event = Event,
> = (
  context: LoomRuntime.Runtime.EventContext<Target, EventType>,
) => unknown

/** Event handler contract supporting simple and contextual forms. */
export type EventHandler<
  Target extends EventTarget = EventTarget,
  EventType extends Event = Event,
> = SimpleHandler | ContextualHandler<Target, EventType>

export type ReferencedEventHandler<
  Target extends EventTarget = EventTarget,
  EventType extends Event = Event,
> = LoomRuntime.Resumability.ReferencedHandler<EventHandler<Target, EventType>>

export interface EventBinding<
  Target extends EventTarget = EventTarget,
  EventType extends Event = Event,
> extends LoomRuntime.Runtime.EventBinding<EventHandler<Target, EventType>> {}

export interface SsrOptions extends LoomRuntime.Runtime.SsrOptions {}

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

export interface EventModifier<
  Target extends EventTarget = EventTarget,
  EventType extends Event = Event,
> {
  readonly _tag: "EventModifier"
  readonly binding: EventBinding<Target, EventType>
}

export type ElementModifier =
  | AttributeModifier
  | ChildrenModifier
  | HydrationModifier
  | EventModifier

const isComponent = (value: Child): value is Component.Type =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "Component"

const isNode = (value: Child): value is LoomCore.Ast.Node =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag !== "Component"

const isReferencedLiveRegion = <Value>(
  value: ((value: Value) => Child) | LoomRuntime.Resumability.ReferencedLiveRegion<Value>,
): value is LoomRuntime.Resumability.ReferencedLiveRegion<Value> =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "ReferencedLiveRegion"

const normalizeChild = (child: Child): ReadonlyArray<LoomCore.Ast.Node> => {
  if (child === undefined || child === null || child === false) {
    return []
  }

  if (typeof child === "string") {
    return [text(child)]
  }

  if (Array.isArray(child)) {
    return child.flatMap(normalizeChild)
  }

  if (isComponent(child)) {
    return [LoomCore.Ast.componentUse(child)]
  }

  if (isNode(child)) {
    return [child]
  }

  return []
}

const normalizeRoot = (child: Child): LoomCore.Ast.Node => {
  const normalized = normalizeChild(child)

  if (normalized.length === 0) {
    return LoomCore.Ast.fragment([])
  }

  return normalized.length === 1 ? normalized[0] : LoomCore.Ast.fragment(normalized)
}

/** Create a neutral text node. */
export const text = (value: string): LoomCore.Ast.TextNode => LoomCore.Ast.text(value)

/** Create a neutral fragment node. */
export const fragment = (...nodes: ReadonlyArray<Child>): LoomCore.Ast.FragmentNode =>
  LoomCore.Ast.fragment(nodes.flatMap(normalizeChild))

/** Add children to an element. */
export const children = (...nodes: ReadonlyArray<Child>): ChildrenModifier => ({
  _tag: "ChildrenModifier",
  children: nodes,
})

/** Add a plain string attribute to an element. */
export const attr = (name: string, value: string): AttributeModifier => ({
  _tag: "AttributeModifier",
  name,
  value,
})

/** Add or extend an element class attribute. */
export const className = (value: string): AttributeModifier => attr("class", value)

/** Create a neutral element node. */
export const el = (tagName: string, ...modifiers: ReadonlyArray<ElementModifier>): LoomCore.Ast.ElementNode => {
  const state: {
    attributes: Record<string, string>
    children: Array<LoomCore.Ast.Node>
    events: Array<LoomCore.Ast.EventBinding>
    hydration: LoomCore.Ast.HydrationMetadata | undefined
  } = {
    attributes: {},
    children: [],
    events: [],
    hydration: undefined,
  }

  for (const modifier of modifiers) {
    switch (modifier._tag) {
      case "AttributeModifier": {
        if (modifier.name === "class" && state.attributes.class !== undefined) {
          state.attributes.class = `${state.attributes.class} ${modifier.value}`
        } else {
          state.attributes[modifier.name] = modifier.value
        }
        break
      }
      case "ChildrenModifier": {
        state.children.push(...modifier.children.flatMap(normalizeChild))
        break
      }
      case "HydrationModifier": {
        state.hydration = modifier.metadata
        Object.assign(state.attributes, modifier.metadata.attributes)
        break
      }
      case "EventModifier": {
        state.events.push(modifier.binding)
        break
      }
    }
  }

  return LoomCore.Ast.element(tagName, state)
}

/** Backwards-compatible alias for the earlier scaffolding API. */
export const element = el

/** Create a live Atom bridge over the Loom neutral AST. */
export const live = <Value>(
  atom: Atom.Atom<Value>,
  render: ((value: Value) => Child) | LoomRuntime.Resumability.ReferencedLiveRegion<Value>,
): LoomCore.Ast.LiveNode<Value> => {
  const normalized = isReferencedLiveRegion(render)
    ? render
    : {
      ref: undefined,
      render,
    }

  const node = LoomCore.Ast.live(atom, (value) => {
    const rendered = normalizeChild(normalized.render(value))
    return rendered.length === 1 ? rendered[0] : LoomCore.Ast.fragment(rendered)
  })

  return normalized.ref === undefined
    ? node
    : {
      ...node,
      ref: normalized.ref,
    }
}

/** Mark an element as hydratable under a given strategy. */
export const hydrate = (strategy: Hydration.Strategy): HydrationModifier => ({
  _tag: "HydrationModifier",
  metadata: Hydration.boundary(strategy),
})

/** Create an event binding descriptor for a future DOM runtime. */
export const on = <Target extends EventTarget = EventTarget, EventType extends Event = Event>(
  event: string,
  handler: EventHandler<Target, EventType> | ReferencedEventHandler<Target, EventType>,
): EventModifier<Target, EventType> => ({
  _tag: "EventModifier",
  binding: internal.makeEventBinding(event, handler),
})

/** Serialize the current Loom tree to SSR HTML plus explicit runtime metadata. */
export const ssr = (root: Child, options?: SsrOptions): SsrResult => {
  const result = LoomRuntime.Runtime.renderToHtml(normalizeRoot(root), options)

  return {
    ...result,
    diagnosticSummary: result.diagnostics.map(LoomRuntime.Diagnostics.summarize),
  }
}

/** Serialize the current Loom tree to SSR HTML only. */
export const renderToString = (root: Child, options?: SsrOptions): string => ssr(root, options).html
