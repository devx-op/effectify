import type * as Component from "../component.js"
import type * as Ast from "../ast.js"

export const makeDefinition = (node: Ast.Node): Component.Definition => ({
  _tag: "Component",
  node,
  capabilities: [],
})

export const appendCapability = (
  definition: Component.Definition,
  capability: Component.Capability,
): Component.Definition => ({
  ...definition,
  capabilities: [...definition.capabilities, capability],
})

export const makeEffectCapability = (
  effect: Component.EffectCapability["effect"],
): Component.EffectCapability => ({
  _tag: "ComponentEffect",
  effect,
})
