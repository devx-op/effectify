import type { Atom } from "effect/unstable/reactivity"
import type * as Ast from "../ast.js"
import type * as Component from "../component.js"

export const makeTextNode = (value: string): Ast.TextNode => ({
  _tag: "Text",
  value,
})

export const makeDynamicTextNode = (render: () => string): Ast.DynamicTextNode => ({
  _tag: "DynamicText",
  render,
})

export const makeElementNode = (
  tagName: string,
  options: {
    readonly attributes: Readonly<Record<string, string>>
    readonly children: ReadonlyArray<Ast.Node>
    readonly events: ReadonlyArray<Ast.EventBinding>
    readonly hydration: Ast.HydrationMetadata | undefined
  },
): Ast.ElementNode => ({
  _tag: "Element",
  tagName,
  attributes: options.attributes,
  children: options.children,
  events: options.events,
  hydration: options.hydration,
})

export const makeFragmentNode = (children: ReadonlyArray<Ast.Node>): Ast.FragmentNode => ({
  _tag: "Fragment",
  children,
})

export const makeComponentUseNode = (component: Component.Definition): Ast.ComponentUseNode => ({
  _tag: "ComponentUse",
  component,
})

export const makeLiveNode = <Value>(
  atom: Atom.Atom<Value>,
  render: Ast.LiveRender<Value>,
): Ast.LiveNode<Value> => ({
  _tag: "Live",
  atom,
  render,
})

export const makeHydrationMetadata = (
  strategy: string,
  attributes: Readonly<Record<string, string>>,
): Ast.HydrationMetadata => ({
  strategy,
  attributes,
})
