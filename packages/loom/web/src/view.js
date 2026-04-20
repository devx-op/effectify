import * as LoomCore from "@effectify/loom-core"
import * as Html from "./html.js"
import * as internal from "./internal/view-node.js"
/** Create a renderer-neutral text node backed by the current Html-first runtime seam. */
export const text = (value) =>
  internal.wrap({
    _tag: "Text",
    value,
  })
/** Create a renderer-neutral fragment. */
export const fragment = (...children) =>
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
export const stack = (...children) => internal.wrap(Html.el("div", Html.children(...children)))
/** Create a neutral horizontal layout primitive. */
export const row = (...children) => internal.wrap(Html.el("div", Html.children(...children)))
/** Create a button node with a click handler. */
export const button = (label, handler) =>
  internal.wrap(Html.el("button", Html.on("click", handler), Html.children(label)))
/** Render content only when a condition is truthy. */
export const when = (condition, content) => condition ? fragment(content) : fragment()
/** Create a semantic main region. */
export const main = (content) => internal.wrap(Html.el("main", Html.children(content)))
/** Create a semantic aside region. */
export const aside = (content) => internal.wrap(Html.el("aside", Html.children(content)))
/** Create a semantic header region. */
export const header = (content) => internal.wrap(Html.el("header", Html.children(content)))
const normalizeChild = (child) => {
  if (child === undefined || child === null || child === false) {
    return []
  }
  if (typeof child === "string") {
    return [{
      _tag: "Text",
      value: child,
    }]
  }
  if (Array.isArray(child)) {
    return child.flatMap(normalizeChild)
  }
  if (typeof child === "object" && child !== null && child._tag === "Component") {
    return [LoomCore.Ast.componentUse(child)]
  }
  return [child]
}
