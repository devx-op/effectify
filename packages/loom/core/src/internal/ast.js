export const makeTextNode = (value) => ({
  _tag: "Text",
  value,
})
export const makeDynamicTextNode = (render) => ({
  _tag: "DynamicText",
  render,
})
export const makeElementNode = (tagName, options) => ({
  _tag: "Element",
  tagName,
  attributes: options.attributes,
  bindings: options.bindings,
  children: options.children,
  events: options.events,
  hydration: options.hydration,
})
export const makeFragmentNode = (children) => ({
  _tag: "Fragment",
  children,
})
export const makeComponentUseNode = (component) => ({
  _tag: "ComponentUse",
  component,
})
export const makeLiveNode = (atom, render) => ({
  _tag: "Live",
  atom,
  render,
})
export const makeHydrationMetadata = (strategy, attributes) => ({
  strategy,
  attributes,
})
