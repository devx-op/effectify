import * as LoomCore from "@effectify/loom-core"
import * as Html from "./html.js"
import * as Slot from "./slot.js"
import * as internal from "./internal/view-node.js"
export type Type = internal.Type
export type Node = LoomCore.Ast.Node
export type Child = Html.Child
export type MaybeChild = Child | undefined | null | false
export type SlotDefinition = Slot.Definition
/** Create a renderer-neutral text node backed by the current Html-first runtime seam. */
export declare const text: (value: string) => Type
/** Create a renderer-neutral fragment. */
export declare const fragment: (...children: ReadonlyArray<MaybeChild>) => Type
/** Create a neutral vertical layout primitive. */
export declare const stack: (...children: ReadonlyArray<MaybeChild>) => Type
/** Create a neutral horizontal layout primitive. */
export declare const row: (...children: ReadonlyArray<MaybeChild>) => Type
/** Create a button node with a click handler. */
export declare const button: (label: string, handler: Html.EventHandler) => Type
/** Render content only when a condition is truthy. */
export declare const when: (condition: unknown, content: MaybeChild) => Type
/** Create a semantic main region. */
export declare const main: (content: MaybeChild) => Type
/** Create a semantic aside region. */
export declare const aside: (content: MaybeChild) => Type
/** Create a semantic header region. */
export declare const header: (content: MaybeChild) => Type
