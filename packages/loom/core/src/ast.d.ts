import type { Atom } from "effect/unstable/reactivity"
import type * as Component from "./component.js"
/** Neutral AST contracts for Loom renderers. */
export type Node = TextNode | ElementNode | FragmentNode | ComponentUseNode | LiveNode<unknown>
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
  readonly ref?: string
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
  readonly atom: Atom.Atom<Value>
  readonly render: LiveRender<Value>
  readonly ref?: string
}
interface LiveRenderSignature<Value> {
  bivarianceHack(value: Value): Node
}
export type LiveRender<Value> = LiveRenderSignature<Value>["bivarianceHack"]
/** Create a neutral text node. */
export declare const text: (value: string) => TextNode
/** Create a neutral element node. */
export declare const element: (tagName: string, options?: {
  readonly attributes?: Readonly<Record<string, string>>
  readonly children?: ReadonlyArray<Node>
  readonly events?: ReadonlyArray<EventBinding>
  readonly hydration?: HydrationMetadata
}) => ElementNode
/** Create a neutral fragment node. */
export declare const fragment: (children: ReadonlyArray<Node>) => FragmentNode
/** Create a neutral component usage node. */
export declare const componentUse: (component: Component.Definition) => ComponentUseNode
/** Create a neutral live node placeholder. */
export declare const live: <Value>(atom: Atom.Atom<Value>, render: LiveRender<Value>) => LiveNode<Value>
/** Create hydration metadata for later renderer/runtime use. */
export declare const hydrationMetadata: (
  strategy: string,
  attributes: Readonly<Record<string, string>>,
) => HydrationMetadata
/** Backwards-compatible alias for earlier hydration-boundary scaffolding. */
export declare const hydrationBoundary: (
  strategy: string,
  attributes: Readonly<Record<string, string>>,
) => HydrationMetadata
