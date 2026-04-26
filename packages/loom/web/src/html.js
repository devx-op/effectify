import * as LoomCore from "@effectify/loom-core"
import * as LoomRuntime from "@effectify/loom-runtime"
import * as Hydration from "./hydration.js"
import * as internal from "./internal/api.js"
import * as viewChild from "./internal/view-child.js"
const isReferencedLiveRegion = (value) =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "ReferencedLiveRegion"
const normalizeRoot = (child) => {
  const normalized = viewChild.normalizeViewChild(child)
  if (normalized.length === 0) {
    return LoomCore.Ast.fragment([])
  }
  return normalized.length === 1 ? normalized[0] : LoomCore.Ast.fragment(normalized)
}
/** Create a low-level neutral text node for the compatibility Html seam. */
export const text = (value) => LoomCore.Ast.text(value)
/** Create a low-level neutral fragment node for the compatibility Html seam. */
export const fragment = (...nodes) => LoomCore.Ast.fragment(viewChild.normalizeViewChildren(nodes))
/** Add children to an element. */
export const children = (...nodes) => ({
  _tag: "ChildrenModifier",
  children: nodes,
})
/** Add a plain string attribute to an element. */
export const attr = (name, value) => ({
  _tag: "AttributeModifier",
  name,
  value,
})
/** Add or extend an element class attribute. */
export const className = (value) => attr("class", value)
/** Create a low-level neutral element node. Prefer `View` + `Web` for new root happy-path authoring. */
export const el = (tagName, ...modifiers) => {
  const state = {
    attributes: {},
    children: [],
    events: [],
    hydration: undefined,
  }
  for (const modifier of modifiers) {
    switch (modifier._tag) {
      case "AttributeModifier": {
        if (modifier.name === "class" && state.attributes.class !== undefined) {
          state.attributes.class = `${state.attributes.class} ${modifier.value}`
        } else {
          state.attributes[modifier.name] = modifier.value
        }
        break
      }
      case "ChildrenModifier": {
        state.children.push(...viewChild.normalizeViewChildren(modifier.children))
        break
      }
      case "HydrationModifier": {
        state.hydration = modifier.metadata
        Object.assign(state.attributes, modifier.metadata.attributes)
        break
      }
      case "EventModifier": {
        state.events.push(modifier.binding)
        break
      }
    }
  }
  return LoomCore.Ast.element(tagName, state)
}
/** Backwards-compatible alias for the earlier scaffolding API. Prefer `Html.el(...)` or the root `View` / `Web` surface. */
export const element = el
/** Create a live Atom bridge over the Loom neutral AST. */
export const live = (atom, render) => {
  const normalized = isReferencedLiveRegion(render)
    ? render
    : {
      ref: undefined,
      render,
    }
  const node = LoomCore.Ast.live(atom, (value) => {
    const rendered = viewChild.normalizeViewChild(normalized.render(value))
    return rendered.length === 1 ? rendered[0] : LoomCore.Ast.fragment(rendered)
  })
  return normalized.ref === undefined
    ? node
    : {
      ...node,
      ref: normalized.ref,
    }
}
/** Mark a low-level Html element as hydratable under a given strategy. */
export const hydrate = (strategy) => ({
  _tag: "HydrationModifier",
  metadata: Hydration.boundary(strategy),
})
/** Create a low-level event binding descriptor for DOM/runtime interoperability. */
export const on = (event, handler) => ({
  _tag: "EventModifier",
  binding: internal.makeEventBinding(event, handler),
})
/** Serialize the current Loom tree to SSR HTML plus explicit runtime metadata for advanced compatibility flows. */
export const ssr = (root, options) => {
  const result = LoomRuntime.Runtime.renderToHtml(normalizeRoot(root), options)
  return {
    ...result,
    diagnosticSummary: result.diagnostics.map(LoomRuntime.Diagnostics.summarize),
  }
}
/** Serialize the current Loom tree to SSR HTML only through the low-level Html seam. */
export const renderToString = (root, options) => ssr(root, options).html
