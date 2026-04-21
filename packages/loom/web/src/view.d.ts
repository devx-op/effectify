import * as LoomCore from "@effectify/loom-core"
import * as Html from "./html.js"
import * as Slot from "./slot.js"
import * as internal from "./internal/view-node.js"
export type Type = internal.Type
export type Node = LoomCore.Ast.Node
export type ViewChild = Html.Child
export type Child = ViewChild
export type MaybeChild = ViewChild
export type SlotDefinition = Slot.Definition
export interface LinkOptions {
  readonly href: string
  readonly target?: string
  readonly rel?: string
  readonly download?: true | string
}
export type LinkTarget = string | LinkOptions
/** Create a renderer-neutral text node backed by the current Html-first runtime seam. */
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
/** Create a router-neutral link node with broad child content. */
export declare const link: (content: ViewChild, target: LinkTarget) => Type
/** Render content only when a condition is truthy. */
export declare const when: (condition: unknown, content: MaybeChild) => Type
/** Create a semantic main region. */
export declare const main: (content: MaybeChild) => Type
/** Create a semantic aside region. */
export declare const aside: (content: MaybeChild) => Type
/** Create a semantic header region. */
export declare const header: (content: MaybeChild) => Type
