import * as internal from "./internal/component.js"
/** Create a component definition from a neutral AST node. */
export const make = (node) => internal.makeDefinition(node)
/** Backwards-compatible alias kept while the public API settles. */
export const fromNode = make
/** Attach an Effect capability to a component definition. */
export const effect = (componentEffect) => internal.makeEffectCapability(componentEffect)
/** Attach a capability to a component definition. */
export const use = (definition, capability) => internal.appendCapability(definition, capability)
