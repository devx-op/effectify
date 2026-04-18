import * as internal from "./internal/ast.js"
import type * as Component from "./component.js"

/** Neutral AST contracts for Loom renderers. */
export type Node =
  | TextNode
  | ElementNode
  | FragmentNode
  | ComponentUseNode
  | LiveNode<unknown>

export interface TextNode {
  readonly _tag: "Text"
  readonly value: string
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
}

export interface ElementNode {
  readonly _tag: "Element"
  readonly tagName: string
  readonly attributes: Readonly<Record<string, string>>
  readonly children: ReadonlyArray<Node>
  readonly events: ReadonlyArray<EventBinding>
  readonly hydration: HydrationMetadata | undefined
}

export interface FragmentNode {
  readonly _tag: "Fragment"
  readonly children: ReadonlyArray<Node>
}

export interface ComponentUseNode {
  readonly _tag: "ComponentUse"
  readonly component: Component.Definition
}

export interface LiveNode<Value> {
  readonly _tag: "Live"
  readonly source: Value
  readonly render: LiveRender<Value>
}

interface LiveRenderSignature<Value> {
  bivarianceHack(value: Value): Node
}

export type LiveRender<Value> = LiveRenderSignature<Value>["bivarianceHack"]

/** Create a neutral text node. */
export const text = (value: string): TextNode => internal.makeTextNode(value)

/** Create a neutral element node. */
export const element = (
  tagName: string,
  options?: {
    readonly attributes?: Readonly<Record<string, string>>
    readonly children?: ReadonlyArray<Node>
    readonly events?: ReadonlyArray<EventBinding>
    readonly hydration?: HydrationMetadata
  },
): ElementNode =>
  internal.makeElementNode(tagName, {
    attributes: options?.attributes ?? {},
    children: options?.children ?? [],
    events: options?.events ?? [],
    hydration: options?.hydration,
  })

/** Create a neutral fragment node. */
export const fragment = (children: ReadonlyArray<Node>): FragmentNode => internal.makeFragmentNode(children)

/** Create a neutral component usage node. */
export const componentUse = (component: Component.Definition): ComponentUseNode =>
  internal.makeComponentUseNode(component)

/** Create a neutral live node placeholder. */
export const live = <Value>(source: Value, render: LiveRender<Value>): LiveNode<Value> =>
  internal.makeLiveNode(source, render)

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
