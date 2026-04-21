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
    readonly bindings: ReadonlyArray<Ast.ElementBinding>
    readonly children: ReadonlyArray<Ast.Node>
    readonly events: ReadonlyArray<Ast.EventBinding>
    readonly hydration: Ast.HydrationMetadata | undefined
  },
): Ast.ElementNode => ({
  _tag: "Element",
  tagName,
  attributes: options.attributes,
  bindings: options.bindings,
  children: options.children,
  events: options.events,
  hydration: options.hydration,
})

export const makeFragmentNode = (children: ReadonlyArray<Ast.Node>): Ast.FragmentNode => ({
  _tag: "Fragment",
  children,
})

export const makeIfNode = (
  condition: () => boolean,
  thenNode: Ast.Node,
  elseNode: Ast.Node | undefined,
): Ast.IfNode => ({
  _tag: "If",
  condition,
  then: thenNode,
  else: elseNode,
})

export const makeForNode = <Item, Key extends PropertyKey = PropertyKey>(
  each: () => Iterable<Item>,
  key: Ast.ForKey<Item, Key>,
  render: Ast.ForRender<Item>,
  fallback: Ast.Node | undefined,
): Ast.ForNode<Item, Key> => ({
  _tag: "For",
  each,
  key,
  render,
  fallback,
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
