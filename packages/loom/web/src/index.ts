/** Primary vNext authoring surface for typed Loom component composition. */
export * as Component from "./component.js"

/** Primary renderer-neutral view surface for new Loom authoring. */
export * as View from "./view.js"

/** Primary Web modifier surface for DOM and browser-specific behavior. */
export * as Web from "./web.js"

/** Primary slot composition surface for layouts and nesting. */
export * as Slot from "./slot.js"

/** Primary mount seam for the current interactive root happy path. */
export { mount } from "./mount.js"

/** Compatibility-focused Html DSL and low-level AST / SSR seam. Prefer `View` + `Web` for new root authoring. */
export * as Html from "./html.js"

/** Advanced diagnostics helpers for adapter and runtime visibility. */
export * as Diagnostics from "./diagnostics.js"

/** Advanced hydration helpers layered after the primary interactive authoring path. */
export * as Hydration from "./hydration.js"

/** Advanced resumability helpers layered after the primary interactive authoring path. */
export * as Resumability from "./resumability.js"
