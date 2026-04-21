import * as LoomCore from "@effectify/loom-core"
import * as Html from "./html.js"
import * as internal from "./internal/view-node.js"
import * as viewChild from "./internal/view-child.js"

const linkTargetModifiers = (target) => {
  const normalized = typeof target === "string" ? { href: target } : target
  const modifiers = [Html.attr("href", normalized.href)]

  if (normalized.target !== undefined) {
    modifiers.push(Html.attr("target", normalized.target))
  }

  if (normalized.rel !== undefined) {
    modifiers.push(Html.attr("rel", normalized.rel))
  }

  if (normalized.download !== undefined) {
    modifiers.push(Html.attr("download", normalized.download === true ? "" : normalized.download))
  }

  return modifiers
}

export function text(value) {
  return typeof value === "function"
    ? internal.wrap(LoomCore.Ast.dynamicText(value))
    : internal.wrap({
      _tag: "Text",
      value,
    })
}
/** Create a renderer-neutral fragment. */
export const fragment = (...children) =>
  internal.wrap({
    _tag: "Fragment",
    children: viewChild.normalizeViewChildren(children),
  })
/** Create a neutral vertical layout primitive. */
export const vstack = (...children) => internal.wrap(Html.el("div", Html.children(...children)))
/** Create a neutral horizontal layout primitive. */
export const hstack = (...children) => internal.wrap(Html.el("div", Html.children(...children)))
/** Compatibility alias for the preferred `View.vstack(...)` primitive. */
export const stack = vstack
/** Compatibility alias for the preferred `View.hstack(...)` primitive. */
export const row = hstack
/** Create a button node with broad child content and click handler support. */
export const button = (content, handler) =>
  internal.wrap(Html.el("button", Html.on("click", handler), Html.children(content)))

/** Create a router-neutral link node with broad child content. */
export const link = (content, target) =>
  internal.wrap(Html.el("a", ...linkTargetModifiers(target), Html.children(content)))
/** Render content only when a condition is truthy. */
export const when = (condition, content) => condition ? fragment(content) : fragment()
/** Create a semantic main region. */
export const main = (content) => internal.wrap(Html.el("main", Html.children(content)))
/** Create a semantic aside region. */
export const aside = (content) => internal.wrap(Html.el("aside", Html.children(content)))
/** Create a semantic header region. */
export const header = (content) => internal.wrap(Html.el("header", Html.children(content)))
