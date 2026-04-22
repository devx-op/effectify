import * as LoomCore from "@effectify/loom-core"
import * as Html from "./html.js"
import * as Slot from "./slot.js"
import * as internal from "./internal/view-node.js"
import * as viewChild from "./internal/view-child.js"
export type Type = internal.Type
export type Node = LoomCore.Ast.Node
export type ViewChild = viewChild.ViewChild
export type Child = ViewChild
export type MaybeChild = ViewChild
export type SlotDefinition = Slot.Definition
export interface ForOptions<Item, Key extends PropertyKey = PropertyKey> {
  readonly key: (item: Item, index: number) => Key
  readonly render: (item: Item, index: number) => MaybeChild
  readonly empty?: MaybeChild
}
export interface LinkOptions {
  readonly href: string
  readonly target?: string
  readonly rel?: string
  readonly download?: true | string
}
export type LinkTarget = string | LinkOptions
/** Create a renderer-neutral text view backed by an inline element root. */
export declare function text(value: string): Type
export declare function text(render: () => string): Type
/** Create a renderer-neutral fragment. */
export declare const fragment: (...children: ReadonlyArray<MaybeChild>) => Type
/** Create a neutral vertical layout primitive. */
export declare const vstack: (...children: ReadonlyArray<MaybeChild>) => Type
/** Create a neutral horizontal layout primitive. */
export declare const hstack: (...children: ReadonlyArray<MaybeChild>) => Type
/** Compatibility alias for the preferred `View.vstack(...)` primitive. */
export declare const stack: (...children: ReadonlyArray<MaybeChild>) => Type
/** Compatibility alias for the preferred `View.hstack(...)` primitive. */
export declare const row: (...children: ReadonlyArray<MaybeChild>) => Type
/** Create a button node with broad child content and click handler support. */
export declare const button: (content: ViewChild, handler: Html.EventHandler) => Type
/** Create the first text-input primitive backed by a text input element. */
export declare const input: () => Type
/** Create a router-neutral link node with broad child content. */
export declare const link: (content: ViewChild, target: LinkTarget) => Type
/** Render exactly one branch from an explicit boolean condition. */
export declare function ifView(condition: boolean, content: MaybeChild, otherwise?: MaybeChild): Type
export declare function ifView(condition: () => boolean, content: MaybeChild, otherwise?: MaybeChild): Type
/** Render content only when a condition is truthy. */
export declare function whenView(condition: unknown, content: MaybeChild, otherwise?: MaybeChild): Type
export declare function whenView(condition: () => unknown, content: MaybeChild, otherwise?: MaybeChild): Type
/** Render a keyed list with explicit snapshot vs tracked collection semantics. */
export declare function forView<Item, Key extends PropertyKey>(
  items: ReadonlyArray<Item>,
  options: ForOptions<Item, Key>,
): Type
export declare function forView<Item, Key extends PropertyKey>(
  items: () => ReadonlyArray<Item>,
  options: ForOptions<Item, Key>,
): Type
export { forView as for, ifView as if, whenView as when }
/** Create a semantic main region. */
export declare const main: (content: MaybeChild) => Type
/** Create a semantic aside region. */
export declare const aside: (content: MaybeChild) => Type
/** Create a semantic header region. */
export declare const header: (content: MaybeChild) => Type
