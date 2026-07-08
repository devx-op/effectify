import * as internal from "./internal/runtime.js"
/** Normalize a handler into a runtime-aware event binding descriptor. */
export const eventBinding = (event, handler) => internal.makeEventBinding(event, handler)
/** Create a render plan without executing runtime semantics yet. */
export const plan = (root, options) => internal.makeRenderPlan(root, options)
/** Render the current neutral tree to SSR HTML plus explicit hydration metadata. */
export const renderToHtml = (root, options) => internal.renderToHtml(root, options)
/** Materialize a serialized resumability contract from the latest SSR render output. */
export const createResumabilityContract = (render, identity) => internal.createResumabilityContract(render, identity)
/** Discover hydratable boundaries from SSR markup. */
export const discoverHydrationBoundaries = (root) => internal.discoverHydrationBoundaries(root)
/** Normalize the current DOM root into a hydration bootstrap plan. */
export const bootstrapHydration = (root) => internal.bootstrapHydration(root)
/** Activate discovered hydration boundaries against the current hydration activation source. */
export const activateHydration = (root, source, options) => internal.activateHydration(root, source, options)
