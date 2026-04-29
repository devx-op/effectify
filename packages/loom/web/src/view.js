import * as LoomCore from "@effectify/loom-core"
import * as Result from "effect/Result"
import * as Component from "./component.js"
import * as Html from "./html.js"
import * as Template from "./template.js"
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
const asRenderable = (node) => Template.renderable(node)
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
/**
 * @deprecated Prefer html`<button web:click=${handler}>...</button>` for DOM authoring. `View.button(...)` remains supported as a compatibility helper with the same runtime behavior.
 */
export const button = (content, handler) =>
  internal.wrap(Html.el("button", Html.on("click", handler), Html.children(content)))
/**
 * @deprecated Prefer html`<input web:value={...}>` or `web:inputValue={...}` for DOM authoring. `View.input()` remains supported as a compatibility helper with the same runtime behavior.
 */
export const input = () => internal.wrap(Html.el("input", Html.attr("type", "text")))
/**
 * @deprecated Prefer html`<a href="...">...</a>` for DOM authoring. `View.link(...)` remains supported as a compatibility helper with the same runtime behavior.
 */
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
const isAsyncResult = (value) =>
  typeof value === "object" && value !== null && "_tag" in value
  && ["Waiting", "Success", "Failure", "Error", "Defect"].includes(value._tag)
const isTaggedUnion = (value) => typeof value === "object" && value !== null && typeof value._tag === "string"
const matchResultLike = (source, handlers) =>
  Result.isSuccess(source) ? handlers.onSuccess(source.success) : handlers.onFailure(source.failure)
const matchAsyncResultLike = (source, handlers) => {
  switch (source._tag) {
    case "Waiting":
      return handlers.onWaiting?.() ?? fragment()
    case "Success":
      return handlers.onSuccess(source.success)
    case "Failure":
      return handlers.onFailure(source.failure)
    case "Error":
      return handlers.onError?.(source.error) ?? fragment()
    case "Defect":
      return handlers.onDefect?.(source.defect) ?? fragment()
  }
}
const matchTaggedUnion = (source, handlers) => {
  const handler = handlers[source._tag]
  return handler === undefined ? handlers.orElse?.(source) ?? fragment() : handler(source)
}
const matchStatic = (source, handlers) => {
  if (Result.isResult(source)) {
    return matchResultLike(source, handlers)
  }

  if (isAsyncResult(source)) {
    return matchAsyncResultLike(source, handlers)
  }

  if (isTaggedUnion(source)) {
    return matchTaggedUnion(source, handlers)
  }

  return fragment()
}
export const match = (source, handlers) => {
  if (typeof handlers !== "object" || handlers === null) {
    return fragment()
  }

  if (typeof source === "function") {
    return asRenderable(LoomCore.Ast.computed(() => normalizeNode(matchStatic(source(), handlers))))
  }

  return matchStatic(source, handlers)
}
const wrapBoundary = (renderable, scope) => asRenderable(LoomCore.Ast.boundary(renderable, scope))
export const catchTag = (tag, _handler) => (self) => wrapBoundary(self, { errors: [tag] })
export const catchAll = (_handler) => (self) => wrapBoundary(self, { errors: "all" })
export const provide = (_provided) => (self) => wrapBoundary(self, { requirementsHandled: true })
export const provideService = (_service) => (self) => wrapBoundary(self, { requirementsHandled: true })
export const use = (component, propsOrComposition, composition) =>
  Template.renderable(Component.use(component, propsOrComposition, composition))
export const of = (component) => use(component)
/** Create a semantic main region. */
export const main = (content) => internal.wrap(Html.el("main", Html.children(content)))
/** Create a semantic aside region. */
export const aside = (content) => internal.wrap(Html.el("aside", Html.children(content)))
/** Create a semantic header region. */
export const header = (content) => internal.wrap(Html.el("header", Html.children(content)))
