import type { Atom, AtomRegistry } from "effect/unstable/reactivity"
import * as LoomCore from "@effectify/loom-core"
import { withStateTracking } from "./tracked-state.js"

interface MountedNode {
  readonly nodes: ReadonlyArray<Node>
  readonly hasDynamicText: boolean
  readonly dispose: () => void
}

export interface MountedView {
  readonly hasDynamicText: boolean
  readonly dispose: () => void
}

const mountTextNode = (value: string): MountedNode => ({
  nodes: [document.createTextNode(value)],
  hasDynamicText: false,
  dispose: () => undefined,
})

const mountDynamicTextNode = (
  node: LoomCore.Ast.DynamicTextNode,
  registry: AtomRegistry.AtomRegistry,
): MountedNode => {
  const textNode = document.createTextNode("")
  const subscriptions = new Map<Atom.Atom<unknown>, () => void>()
  let disposed = false

  const disposeSubscriptions = (): void => {
    for (const unsubscribe of subscriptions.values()) {
      unsubscribe()
    }

    subscriptions.clear()
  }

  const render = (): void => {
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

const mountNode = (node: LoomCore.Ast.Node, registry: AtomRegistry.AtomRegistry): MountedNode => {
  switch (node._tag) {
    case "Text":
      return mountTextNode(node.value)
    case "DynamicText":
      return mountDynamicTextNode(node, registry)
    case "ComponentUse":
      return mountNode(node.component.node, registry)
    case "Live":
      return mountTextNode("")
    case "Fragment": {
      const children = node.children.map((child) => mountNode(child, registry))

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

      for (const [name, value] of Object.entries(node.attributes)) {
        element.setAttribute(name, value)
      }

      const children = node.children.map((child) => mountNode(child, registry))

      for (const child of children) {
        element.append(...child.nodes)
      }

      return {
        nodes: [element],
        hasDynamicText: children.some((child) => child.hasDynamicText),
        dispose: () => {
          for (let index = children.length - 1; index >= 0; index--) {
            children[index]?.dispose()
          }
        },
      }
    }
  }
}

export const mountView = (
  root: Element,
  node: LoomCore.Ast.Node,
  registry: AtomRegistry.AtomRegistry,
): MountedView => {
  const mounted = mountNode(node, registry)

  root.replaceChildren(...mounted.nodes)

  return {
    hasDynamicText: mounted.hasDynamicText,
    dispose: mounted.dispose,
  }
}
