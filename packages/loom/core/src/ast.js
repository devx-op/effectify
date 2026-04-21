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
/** Create a neutral component usage node. */
export const componentUse = (component) => internal.makeComponentUseNode(component)
/** Create a neutral live node placeholder. */
export const live = (atom, render) => internal.makeLiveNode(atom, render)
/** Create hydration metadata for later renderer/runtime use. */
export const hydrationMetadata = (strategy, attributes) => internal.makeHydrationMetadata(strategy, attributes)
/** Backwards-compatible alias for earlier hydration-boundary scaffolding. */
export const hydrationBoundary = (strategy, attributes) => hydrationMetadata(strategy, attributes)
