import * as LoomCore from "@effectify/loom-core"
import * as Html from "./html.js"
import type * as Component from "./component.js"
import * as Slot from "./slot.js"
import * as internal from "./internal/view-node.js"

export type Type = internal.Type
export type Node = LoomCore.Ast.Node
export type Child = Html.Child
export type MaybeChild = Child | undefined | null | false
export type SlotDefinition = Slot.Definition

/** Create a renderer-neutral text node backed by the current Html-first runtime seam. */
export const text = (value: string): Type =>
  internal.wrap({
    _tag: "Text",
    value,
  })

/** Create a renderer-neutral fragment. */
export const fragment = (...children: ReadonlyArray<MaybeChild>): Type =>
  internal.wrap({
    _tag: "Fragment",
    children: children.flatMap((child) => {
      if (Array.isArray(child)) {
        return child.flatMap((nestedChild) => normalizeChild(nestedChild))
      }

      return normalizeChild(child)
    }),
  })

/** Create a neutral vertical layout primitive. */
export const stack = (...children: ReadonlyArray<MaybeChild>): Type =>
  internal.wrap(Html.el("div", Html.children(...children)))

/** Create a neutral horizontal layout primitive. */
export const row = (...children: ReadonlyArray<MaybeChild>): Type =>
  internal.wrap(Html.el("div", Html.children(...children)))

/** Create a button node with a click handler. */
export const button = (label: string, handler: Html.EventHandler): Type =>
  internal.wrap(Html.el("button", Html.on("click", handler), Html.children(label)))

/** Render content only when a condition is truthy. */
export const when = (condition: unknown, content: MaybeChild): Type => condition ? fragment(content) : fragment()

/** Create a semantic main region. */
export const main = (content: MaybeChild): Type => internal.wrap(Html.el("main", Html.children(content)))

/** Create a semantic aside region. */
export const aside = (content: MaybeChild): Type => internal.wrap(Html.el("aside", Html.children(content)))

/** Create a semantic header region. */
export const header = (content: MaybeChild): Type => internal.wrap(Html.el("header", Html.children(content)))

const isComponentChild = (child: Child): child is Component.Type =>
  typeof child === "object" && child !== null && "_tag" in child && child._tag === "Component"

const isNodeChild = (child: Child): child is LoomCore.Ast.Node =>
  typeof child === "object" && child !== null && "_tag" in child && child._tag !== "Component"

const normalizeChild = (child: MaybeChild): ReadonlyArray<LoomCore.Ast.Node> => {
  if (child === undefined || child === null || child === false) {
    return []
  }

  if (typeof child === "string") {
    return [{ _tag: "Text", value: child }]
  }

  if (Array.isArray(child)) {
    return child.flatMap(normalizeChild)
  }

  if (isComponentChild(child)) {
    return [LoomCore.Ast.componentUse(child)]
  }

  if (isNodeChild(child)) {
    return [child]
  }

  return []
}
