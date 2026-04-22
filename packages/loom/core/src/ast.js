import * as internal from "./internal/ast.js"
/** Create a neutral text node. */
export const text = (value) => internal.makeTextNode(value)
/** Create a neutral dynamic text node. */
export const dynamicText = (render) => internal.makeDynamicTextNode(render)
/** Create a neutral element node. */
export const element = (tagName, options) =>
  internal.makeElementNode(tagName, {
    attributes: options?.attributes ?? {},
    bindings: options?.bindings ?? [],
    children: options?.children ?? [],
    events: options?.events ?? [],
    hydration: options?.hydration,
  })
/** Create a neutral fragment node. */
export const fragment = (children) => internal.makeFragmentNode(children)
/** Create a structural control-flow branch node. */
export const ifNode = (condition, thenNode, elseNode) => internal.makeIfNode(condition, thenNode, elseNode)
export function forEach(each, renderOrOptions, fallback) {
  if (typeof renderOrOptions === "function") {
    return internal.makeForNode(each, (_item, index) => index, renderOrOptions, fallback)
  }
  return internal.makeForNode(each, renderOrOptions.key, renderOrOptions.render, renderOrOptions.fallback)
}
/** Create a neutral component usage node. */
export const componentUse = (component) => internal.makeComponentUseNode(component)
/** Create a neutral live node placeholder. */
export const live = (atom, render) => internal.makeLiveNode(atom, render)
/** Create hydration metadata for later renderer/runtime use. */
export const hydrationMetadata = (strategy, attributes) => internal.makeHydrationMetadata(strategy, attributes)
/** Backwards-compatible alias for earlier hydration-boundary scaffolding. */
export const hydrationBoundary = (strategy, attributes) => hydrationMetadata(strategy, attributes)
