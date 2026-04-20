import { withStateTracking } from "./tracked-state.js"
const isContextualHandler = (handler) => typeof handler === "function"
const isEventTarget = (value) =>
  typeof value === "object" && value !== null && "addEventListener" in value && "dispatchEvent" in value
const mountTextNode = (value) => ({
  nodes: [document.createTextNode(value)],
  hasDynamicText: false,
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
    hasDynamicText: true,
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
        hasDynamicText: children.some((child) => child.hasDynamicText),
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
      const children = node.children.map((child) => mountNode(child, registry, root))
      for (const child of children) {
        element.append(...child.nodes)
      }
      return {
        nodes: [element],
        hasDynamicText: children.some((child) => child.hasDynamicText),
        dispose: () => {
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
    hasDynamicText: mounted.hasDynamicText,
    dispose: mounted.dispose,
  }
}
