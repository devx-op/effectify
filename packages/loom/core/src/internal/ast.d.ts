import type { Atom } from "effect/unstable/reactivity"
import type * as Ast from "../ast.js"
import type * as Component from "../component.js"
export declare const makeTextNode: (value: string) => Ast.TextNode
export declare const makeDynamicTextNode: (render: () => string) => Ast.DynamicTextNode
export declare const makeElementNode: (tagName: string, options: {
  readonly attributes: Readonly<Record<string, string>>
  readonly children: ReadonlyArray<Ast.Node>
  readonly events: ReadonlyArray<Ast.EventBinding>
  readonly hydration: Ast.HydrationMetadata | undefined
}) => Ast.ElementNode
export declare const makeFragmentNode: (children: ReadonlyArray<Ast.Node>) => Ast.FragmentNode
export declare const makeComponentUseNode: (component: Component.Definition) => Ast.ComponentUseNode
export declare const makeLiveNode: <Value>(atom: Atom.Atom<Value>, render: Ast.LiveRender<Value>) => Ast.LiveNode<Value>
export declare const makeHydrationMetadata: (
  strategy: string,
  attributes: Readonly<Record<string, string>>,
) => Ast.HydrationMetadata
