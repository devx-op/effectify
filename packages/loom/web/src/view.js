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
const textChildNode = (value) =>
  typeof value === "function"
    ? LoomCore.Ast.dynamicText(value)
    : LoomCore.Ast.text(value)
const normalizeNode = (child) => {
  const normalized = viewChild.normalizeViewChild(child)
  if (normalized.length === 0) {
    return LoomCore.Ast.fragment([])
  }
  return normalized.length === 1 ? normalized[0] : LoomCore.Ast.fragment(normalized)
}
const renderSnapshotForItems = (items, options) =>
  items.length === 0
    ? fragment(options.empty)
    : fragment(...items.map((item, index) => options.render(item, index)))
export function text(value) {
  return internal.wrap(Html.el("span", Html.children(textChildNode(value))))
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
/** Create the first text-input primitive backed by a text input element. */
export const input = () => internal.wrap(Html.el("input", Html.attr("type", "text")))
/** Create a router-neutral link node with broad child content. */
export const link = (content, target) =>
  internal.wrap(Html.el("a", ...linkTargetModifiers(target), Html.children(content)))
const renderIf = (condition, content, otherwise) => {
  if (typeof condition === "function") {
    return internal.wrap(
      LoomCore.Ast.ifNode(
        condition,
        normalizeNode(content),
        otherwise === undefined ? undefined : normalizeNode(otherwise),
      ),
    )
  }
  return condition ? fragment(content) : fragment(otherwise)
}
export function ifView(condition, content, otherwise) {
  return renderIf(condition, content, otherwise)
}
const renderWhen = (condition, content, otherwise) =>
  typeof condition === "function"
    ? renderIf(() => Boolean(condition()), content, otherwise)
    : renderIf(Boolean(condition), content, otherwise)
export function whenView(condition, content, otherwise) {
  return renderWhen(condition, content, otherwise)
}
const forViewImpl = (items, options) => {
  if (typeof items === "function") {
    return internal.wrap(LoomCore.Ast.forEach(() => items(), {
      key: options.key,
      render: (item, index) => normalizeNode(options.render(item, index)),
      fallback: options.empty === undefined ? undefined : normalizeNode(options.empty),
    }))
  }
  return renderSnapshotForItems(items, options)
}
export function forView(items, options) {
  return forViewImpl(items, options)
}
export { forView as for, ifView as if, whenView as when }
/** Create a semantic main region. */
export const main = (content) => internal.wrap(Html.el("main", Html.children(content)))
/** Create a semantic aside region. */
export const aside = (content) => internal.wrap(Html.el("aside", Html.children(content)))
/** Create a semantic header region. */
export const header = (content) => internal.wrap(Html.el("header", Html.children(content)))
