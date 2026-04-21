import { withStateTracking } from "./tracked-state.js"
const isContextualHandler = (handler) => typeof handler === "function"
const isEventTarget = (value) =>
  typeof value === "object" && value !== null && "addEventListener" in value && "dispatchEvent" in value
const isPresent = (value) => value !== undefined
const serializeClassBindings = (values) => {
  const present = values.filter(isPresent)
  if (present.length === 0) {
    return undefined
  }
  if (present.every((value) => value === "")) {
    return ""
  }
  return present.filter((value) => value.length > 0).join(" ")
}
const serializeStyleBindings = (values) => {
  const present = values.filter(isPresent).map((value) => value.trim().replace(/;+$/u, ""))
  if (present.length === 0) {
    return undefined
  }
  if (present.every((value) => value === "")) {
    return ""
  }
  return present.filter((value) => value.length > 0).join(";")
}
const mountElementBindings = (element, node, registry) => {
  if (node.bindings.length === 0) {
    return {
      hasReactiveBindings: false,
      dispose: () => undefined,
    }
  }
  const baseAttributes = node.attributes
  const states = []
  const setAttribute = (name, value) => {
    if (value === undefined) {
      element.removeAttribute(name)
      return
    }
    element.setAttribute(name, value)
  }
  const recomputeAttr = (name) => {
    let nextValue = baseAttributes[name]
    for (const state of states) {
      if (state.binding._tag === "AttrBinding" && state.binding.name === name && state.value !== undefined) {
        nextValue = state.value
      }
    }
    setAttribute(name, nextValue)
  }
  const recomputeClass = () => {
    const classValues = [
      baseAttributes.class,
      ...states.flatMap((state) => state.binding._tag === "ClassBinding" ? [state.value] : []),
    ]
    setAttribute("class", serializeClassBindings(classValues))
  }
  const recomputeStyle = () => {
    const styleValues = [
      baseAttributes.style,
      ...states.flatMap((state) => state.binding._tag === "StyleBinding" ? [state.value] : []),
    ]
    setAttribute("style", serializeStyleBindings(styleValues))
  }
  const recompute = (binding) => {
    switch (binding._tag) {
      case "AttrBinding":
        recomputeAttr(binding.name)
        break
      case "ClassBinding":
        recomputeClass()
        break
      case "StyleBinding":
        recomputeStyle()
        break
    }
  }
  for (const binding of node.bindings) {
    const subscriptions = new Map()
    let disposed = false
    const state = {
      binding,
      value: undefined,
      subscriptions,
      dispose: () => {
        disposed = true
        for (const unsubscribe of subscriptions.values()) {
          unsubscribe()
        }
        subscriptions.clear()
      },
    }
    const render = () => {
      if (disposed) {
        return
      }
      const tracked = withStateTracking(() => binding.render())
      if (state.value !== tracked.value) {
        state.value = tracked.value
        recompute(binding)
      }
      const nextAtoms = new Set(tracked.atoms)
      for (const [atom, unsubscribe] of subscriptions) {
        if (!nextAtoms.has(atom)) {
          unsubscribe()
          subscriptions.delete(atom)
        }
      }
      for (const atom of nextAtoms) {
        if (!subscriptions.has(atom)) {
          subscriptions.set(atom, registry.subscribe(atom, render))
        }
      }
    }
    states.push(state)
    render()
  }
  return {
    hasReactiveBindings: true,
    dispose: () => {
      for (let index = states.length - 1; index >= 0; index--) {
        states[index]?.dispose()
      }
    },
  }
}
const mountTextNode = (value) => ({
  nodes: [document.createTextNode(value)],
  hasReactiveBindings: false,
  dispose: () => undefined,
})
const mountDynamicTextNode = (node, registry) => {
  const textNode = document.createTextNode("")
  const subscriptions = new Map()
  let disposed = false
  const disposeSubscriptions = () => {
    for (const unsubscribe of subscriptions.values()) {
      unsubscribe()
    }
    subscriptions.clear()
  }
  const render = () => {
    if (disposed) {
      return
    }
    const tracked = withStateTracking(() => String(node.render()))
    if (textNode.data !== tracked.value) {
      textNode.data = tracked.value
    }
    const nextAtoms = new Set(tracked.atoms)
    for (const [atom, unsubscribe] of subscriptions) {
      if (!nextAtoms.has(atom)) {
        unsubscribe()
        subscriptions.delete(atom)
      }
    }
    for (const atom of nextAtoms) {
      if (!subscriptions.has(atom)) {
        subscriptions.set(atom, registry.subscribe(atom, render))
      }
    }
  }
  render()
  return {
    nodes: [textNode],
    hasReactiveBindings: true,
    dispose: () => {
      disposed = true
      disposeSubscriptions()
    },
  }
}
const mountNode = (node, registry, root) => {
  switch (node._tag) {
    case "Text":
      return mountTextNode(node.value)
    case "DynamicText":
      return mountDynamicTextNode(node, registry)
    case "ComponentUse":
      return mountNode(node.component.node, registry, root)
    case "Live":
      return mountTextNode("")
    case "Fragment": {
      const children = node.children.map((child) => mountNode(child, registry, root))
      return {
        nodes: children.flatMap((child) => child.nodes),
        hasReactiveBindings: children.some((child) => child.hasReactiveBindings),
        dispose: () => {
          for (let index = children.length - 1; index >= 0; index--) {
            children[index]?.dispose()
          }
        },
      }
    }
    case "Element": {
      const element = document.createElement(node.tagName)
      const cleanup = []
      for (const [name, value] of Object.entries(node.attributes)) {
        element.setAttribute(name, value)
      }
      for (const binding of node.events) {
        const handler = binding.handler
        if (!isContextualHandler(handler)) {
          continue
        }
        const listener = (event) => {
          handler({
            event,
            target: isEventTarget(event.target) ? event.target : element,
            currentTarget: element,
            runtime: {
              root,
            },
          })
        }
        element.addEventListener(binding.event, listener)
        cleanup.push(() => element.removeEventListener(binding.event, listener))
      }
      const mountedBindings = mountElementBindings(element, node, registry)
      const children = node.children.map((child) => mountNode(child, registry, root))
      for (const child of children) {
        element.append(...child.nodes)
      }
      return {
        nodes: [element],
        hasReactiveBindings: mountedBindings.hasReactiveBindings || children.some((child) => child.hasReactiveBindings),
        dispose: () => {
          mountedBindings.dispose()
          for (let index = cleanup.length - 1; index >= 0; index--) {
            cleanup[index]?.()
          }
          for (let index = children.length - 1; index >= 0; index--) {
            children[index]?.dispose()
          }
        },
      }
    }
  }
}
export const mountView = (root, node, registry) => {
  const mounted = mountNode(node, registry, root)
  root.replaceChildren(...mounted.nodes)
  return {
    hasReactiveBindings: mounted.hasReactiveBindings,
    dispose: mounted.dispose,
  }
}
