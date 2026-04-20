export const makeDefinition = (node) => ({
  _tag: "Component",
  node,
  capabilities: [],
})
export const appendCapability = (definition, capability) => ({
  ...definition,
  capabilities: [...definition.capabilities, capability],
})
export const makeEffectCapability = (effect) => ({
  _tag: "ComponentEffect",
  effect,
})
