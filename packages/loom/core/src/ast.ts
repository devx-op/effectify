import type { Atom } from "effect/unstable/reactivity"
import * as internal from "./internal/ast.js"
import type * as Component from "./component.js"

/** Neutral AST contracts for Loom renderers. */
export type Node =
  | TextNode
  | DynamicTextNode
  | ComputedNode
  | ElementNode
  | FragmentNode
  | IfNode
  | ForNode<unknown>
  | ComponentUseNode
  | BoundaryNode
  | LiveNode<unknown>

export interface TextNode {
  readonly _tag: "Text"
  readonly value: string
}

export interface DynamicTextNode {
  readonly _tag: "DynamicText"
  readonly render: () => string
}

export interface ComputedNode {
  readonly _tag: "Computed"
  readonly render: () => Node
}

export interface HydrationMetadata {
  readonly strategy: string
  readonly attributes: Readonly<Record<string, string>>
}

export interface EventBinding<Handler = unknown> {
  readonly _tag: "EventBinding"
  readonly event: string
  readonly mode: "effect" | "contextual"
  readonly handler: Handler
  readonly ref?: string
}

export interface AttrBinding {
  readonly _tag: "AttrBinding"
  readonly name: string
  readonly render: () => string | undefined
}

export interface ClassBinding {
  readonly _tag: "ClassBinding"
  readonly render: () => string | undefined
}

export interface StyleBinding {
  readonly _tag: "StyleBinding"
  readonly render: () => string | undefined
}

export interface ValueBinding {
  readonly _tag: "ValueBinding"
  readonly render: () => string | undefined
}

export type ElementBinding = AttrBinding | ClassBinding | StyleBinding | ValueBinding

export interface ElementNode {
  readonly _tag: "Element"
  readonly tagName: string
  readonly attributes: Readonly<Record<string, string>>
  readonly bindings: ReadonlyArray<ElementBinding>
  readonly children: ReadonlyArray<Node>
  readonly events: ReadonlyArray<EventBinding>
  readonly hydration: HydrationMetadata | undefined
}

export interface FragmentNode {
  readonly _tag: "Fragment"
  readonly children: ReadonlyArray<Node>
}

export interface IfNode {
  readonly _tag: "If"
  readonly condition: () => boolean
  readonly then: Node
  readonly else: Node | undefined
}

interface ForKeySignature<Item, Key extends PropertyKey> {
  bivarianceHack(item: Item, index: number): Key
}

export type ForKey<Item, Key extends PropertyKey = PropertyKey> = ForKeySignature<Item, Key>["bivarianceHack"]

interface ForRenderSignature<Item> {
  bivarianceHack(item: Item, index: number): Node
}

export type ForRender<Item> = ForRenderSignature<Item>["bivarianceHack"]

export interface ForNode<Item, Key extends PropertyKey = PropertyKey> {
  readonly _tag: "For"
  readonly each: () => Iterable<Item>
  readonly key: ForKey<Item, Key>
  readonly render: ForRender<Item>
  readonly fallback: Node | undefined
}

export interface KeyedForOptions<Item, Key extends PropertyKey = PropertyKey> {
  readonly key: ForKey<Item, Key>
  readonly render: ForRender<Item>
  readonly fallback?: Node
}

export interface ComponentUseNode {
  readonly _tag: "ComponentUse"
  readonly component: Component.Definition
}

export interface BoundaryNode {
  readonly _tag: "Boundary"
  readonly node: Node
  readonly scope: {
    readonly errors?: ReadonlyArray<string> | "all"
    readonly requirementsHandled?: boolean
  }
}

export interface LiveNode<Value> {
  readonly _tag: "Live"
  readonly atom: Atom.Atom<Value>
  readonly render: LiveRender<Value>
  readonly ref?: string
}

interface LiveRenderSignature<Value> {
  bivarianceHack(value: Value): Node
}

export type LiveRender<Value> = LiveRenderSignature<Value>["bivarianceHack"]

/** Create a neutral text node. */
export const text = (value: string): TextNode => internal.makeTextNode(value)

/** Create a neutral dynamic text node. */
export const dynamicText = (render: () => string): DynamicTextNode => internal.makeDynamicTextNode(render)

/** Create a neutral computed subtree node. */
export const computed = (render: () => Node): ComputedNode => internal.makeComputedNode(render)

/** Create a neutral element node. */
export const element = (
  tagName: string,
  options?: {
    readonly attributes?: Readonly<Record<string, string>>
    readonly bindings?: ReadonlyArray<ElementBinding>
    readonly children?: ReadonlyArray<Node>
    readonly events?: ReadonlyArray<EventBinding>
    readonly hydration?: HydrationMetadata
  },
): ElementNode =>
  internal.makeElementNode(tagName, {
    attributes: options?.attributes ?? {},
    bindings: options?.bindings ?? [],
    children: options?.children ?? [],
    events: options?.events ?? [],
    hydration: options?.hydration,
  })

/** Create a neutral fragment node. */
export const fragment = (children: ReadonlyArray<Node>): FragmentNode => internal.makeFragmentNode(children)

/** Create a structural control-flow branch node. */
export const ifNode = (condition: () => boolean, thenNode: Node, elseNode?: Node): IfNode =>
  internal.makeIfNode(condition, thenNode, elseNode)

/** Create a structural control-flow list node. */
export function forEach<Item>(
  each: () => Iterable<Item>,
  render: ForRender<Item>,
  fallback?: Node,
): ForNode<Item, number>
export function forEach<Item, Key extends PropertyKey>(
  each: () => Iterable<Item>,
  options: KeyedForOptions<Item, Key>,
): ForNode<Item, Key>
export function forEach<Item, Key extends PropertyKey>(
  each: () => Iterable<Item>,
  renderOrOptions: ForRender<Item> | KeyedForOptions<Item, Key>,
  fallback?: Node,
): ForNode<Item, PropertyKey> {
  if (typeof renderOrOptions === "function") {
    return internal.makeForNode(each, (_item, index) => index, renderOrOptions, fallback)
  }

  return internal.makeForNode(each, renderOrOptions.key, renderOrOptions.render, renderOrOptions.fallback)
}

/** Create a neutral component usage node. */
export const componentUse = (component: Component.Definition): ComponentUseNode =>
  internal.makeComponentUseNode(component)

/** Create a neutral scoped boundary node for local composition handling. */
export const boundary = (
  node: Node,
  scope: {
    readonly errors?: ReadonlyArray<string> | "all"
    readonly requirementsHandled?: boolean
  },
): BoundaryNode => internal.makeBoundaryNode(node, scope)

/** Create a neutral live node placeholder. */
export const live = <Value>(atom: Atom.Atom<Value>, render: LiveRender<Value>): LiveNode<Value> =>
  internal.makeLiveNode(atom, render)

/** Create hydration metadata for later renderer/runtime use. */
export const hydrationMetadata = (
  strategy: string,
  attributes: Readonly<Record<string, string>>,
): HydrationMetadata => internal.makeHydrationMetadata(strategy, attributes)

/** Backwards-compatible alias for earlier hydration-boundary scaffolding. */
export const hydrationBoundary = (
  strategy: string,
  attributes: Readonly<Record<string, string>>,
): HydrationMetadata => hydrationMetadata(strategy, attributes)
