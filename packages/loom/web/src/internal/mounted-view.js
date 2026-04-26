import * as LoomCore from "@effectify/loom-core"
import {
  DuplicateControlFlowKeyError,
  MismatchedMountedRangeParentError,
  MissingMountedRangeParentError,
} from "./control-flow-error.js"
import { makeMountedRange } from "./mounted-range.js"
import { withStateTracking } from "./tracked-state.js"
const isContextualHandler = (handler) => typeof handler === "function"
const isEventTarget = (value) =>
  typeof value === "object" && value !== null && "addEventListener" in value && "dispatchEvent" in value
const isValueElement = (element) => "value" in element
const isFocusedElement = (element) => element.ownerDocument?.activeElement === element
const isTextSelectableInput = (element) =>
  element instanceof HTMLInputElement
  && ["text", "search", "url", "tel", "password", "email"].includes(element.type)
const captureSelection = (element) => {
  if (!isTextSelectableInput(element)) {
    return undefined
  }
  if (element.selectionStart === null || element.selectionEnd === null) {
    return undefined
  }
  return {
    start: element.selectionStart,
    end: element.selectionEnd,
    direction: element.selectionDirection,
  }
}
const restoreSelection = (element, selection) => {
  if (!isTextSelectableInput(element) || selection === undefined) {
    return
  }
  const limit = element.value.length
  const start = Math.min(selection.start, limit)
  const end = Math.min(selection.end, limit)
  if (selection.direction === null) {
    element.setSelectionRange(start, end)
    return
  }
  element.setSelectionRange(start, end, selection.direction)
}
const syncValueAttribute = (element, value) => {
  if (value === undefined) {
    element.removeAttribute("value")
    return
  }
  element.setAttribute("value", value)
}
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
const setValueProperty = (element, value, state) => {
  if (!isValueElement(element)) {
    return
  }
  const nextValue = value ?? ""
  const lastWrittenValue = state.lastWrittenValue ?? ""
  const selection = isFocusedElement(element) ? captureSelection(element) : undefined
  if (isFocusedElement(element) && element.value !== lastWrittenValue) {
    if (element.value === nextValue) {
      state.lastWrittenValue = value
      syncValueAttribute(element, value)
    }
    return
  }
  element.value = nextValue
  state.lastWrittenValue = value
  syncValueAttribute(element, value)
  restoreSelection(element, selection)
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
  const valueState = {
    lastWrittenValue: baseAttributes.value,
  }
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
  const recomputeValue = () => {
    let nextValue = baseAttributes.value
    for (const state of states) {
      if (state.binding._tag === "ValueBinding" && state.value !== undefined) {
        nextValue = state.value
      }
    }
    setValueProperty(element, nextValue, valueState)
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
      case "ValueBinding":
        recomputeValue()
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
const syncTrackedSubscriptions = (subscriptions, atoms, registry, render) => {
  const nextAtoms = new Set(atoms)
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
    syncTrackedSubscriptions(subscriptions, tracked.atoms, registry, render)
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
const emptyNode = LoomCore.Ast.fragment([])
const resolveRangeParent = (owner, start, end) => {
  const parent = start.parentNode
  if (parent === null || end.parentNode === null) {
    throw new MissingMountedRangeParentError({ owner })
  }
  if (parent !== end.parentNode) {
    throw new MismatchedMountedRangeParentError({ owner })
  }
  return parent
}
const insertNodesBefore = (parent, anchor, nodes) => {
  const fragment = anchor.ownerDocument?.createDocumentFragment() ?? document.createDocumentFragment()
  for (const node of nodes) {
    fragment.append(node)
  }
  parent.insertBefore(fragment, anchor)
}
const moveRangeBefore = (owner, start, end, anchor) => {
  const parent = resolveRangeParent(owner, start, end)
  if (anchor.parentNode !== parent) {
    throw new MismatchedMountedRangeParentError({ owner })
  }
  const fragment = anchor.ownerDocument?.createDocumentFragment() ?? document.createDocumentFragment()
  let current = start
  while (current !== null) {
    const next = current.nextSibling
    fragment.append(current)
    if (current === end) {
      break
    }
    current = next
  }
  parent.insertBefore(fragment, anchor)
}
const removeRangeNodes = (owner, start, end) => {
  const parent = resolveRangeParent(owner, start, end)
  let current = start
  while (current !== null) {
    const next = current.nextSibling
    parent.removeChild(current)
    if (current === end) {
      break
    }
    current = next
  }
}
const mountIfNode = (node, registry, root) => {
  const range = makeMountedRange("if")
  const subscriptions = new Map()
  let disposed = false
  let tracked = withStateTracking(() => node.condition())
  let mountedBranch = mountNode(tracked.value ? node.then : (node.else ?? emptyNode), registry, root)
  const render = () => {
    if (disposed) {
      return
    }
    const nextTracked = withStateTracking(() => node.condition())
    if (nextTracked.value !== tracked.value) {
      const nextBranch = mountNode(nextTracked.value ? node.then : (node.else ?? emptyNode), registry, root)
      range.replace(nextBranch.nodes)
      mountedBranch.dispose()
      mountedBranch = nextBranch
    }
    tracked = nextTracked
    syncTrackedSubscriptions(subscriptions, tracked.atoms, registry, render)
  }
  syncTrackedSubscriptions(subscriptions, tracked.atoms, registry, render)
  return {
    nodes: [range.start, ...mountedBranch.nodes, range.end],
    hasReactiveBindings: tracked.atoms.size > 0 || mountedBranch.hasReactiveBindings,
    dispose: () => {
      disposed = true
      for (const unsubscribe of subscriptions.values()) {
        unsubscribe()
      }
      subscriptions.clear()
      mountedBranch.dispose()
    },
  }
}
const mountedForItemNodes = (entry) => [
  entry.range.start,
  ...entry.mounted.nodes,
  entry.range.end,
]
const makeMountedForItem = (key, item, index, mounted) => ({
  key,
  item,
  index,
  range: makeMountedRange(`for-item:${String(key)}`),
  mounted,
})
const disposeMountedForItem = (entry) => {
  entry.mounted.dispose()
}
const detachMountedForItem = (entry) => {
  if (entry.range.start.parentNode !== null && entry.range.end.parentNode !== null) {
    removeRangeNodes(entry.range.owner, entry.range.start, entry.range.end)
  }
}
const replaceMountedForItem = (entry, item, index, mounted) => {
  if (entry.range.start.parentNode !== null && entry.range.end.parentNode !== null) {
    entry.range.replace(mounted.nodes)
  }
  entry.mounted.dispose()
  entry.item = item
  entry.index = index
  entry.mounted = mounted
}
const assertDistinctForKeys = (owner, entries) => {
  const seen = new Set()
  for (const [key] of entries) {
    if (seen.has(key)) {
      throw new DuplicateControlFlowKeyError({ owner, key })
    }
    seen.add(key)
  }
}
const mountForNode = (node, registry, root) => {
  const range = makeMountedRange("for")
  const subscriptions = new Map()
  let disposed = false
  let tracked = withStateTracking(() => Array.from(node.each()))
  const materializeEntries = (items) => items.map((item, index) => [node.key(item, index), item, index])
  const mountItems = (entries) =>
    entries.map(([key, item, index]) =>
      makeMountedForItem(key, item, index, mountNode(node.render(item, index), registry, root))
    )
  const initialEntries = materializeEntries(tracked.value)
  assertDistinctForKeys("for", initialEntries)
  let mountedState = initialEntries.length === 0
    ? { _tag: "empty", fallback: node.fallback === undefined ? undefined : mountNode(node.fallback, registry, root) }
    : { _tag: "items", items: mountItems(initialEntries) }
  const render = () => {
    if (disposed) {
      return
    }
    const nextTracked = withStateTracking(() => Array.from(node.each()))
    const nextEntries = materializeEntries(nextTracked.value)
    assertDistinctForKeys("for", nextEntries)
    if (nextEntries.length === 0) {
      const nextFallback = node.fallback === undefined ? undefined : mountNode(node.fallback, registry, root)
      range.replace(nextFallback === undefined ? [] : nextFallback.nodes)
      if (mountedState._tag === "items") {
        for (let index = mountedState.items.length - 1; index >= 0; index--) {
          const entry = mountedState.items[index]
          if (entry !== undefined) {
            disposeMountedForItem(entry)
          }
        }
      } else {
        mountedState.fallback?.dispose()
      }
      mountedState = { _tag: "empty", fallback: nextFallback }
      tracked = nextTracked
      syncTrackedSubscriptions(subscriptions, tracked.atoms, registry, render)
      return
    }
    if (mountedState._tag === "empty") {
      const nextItems = mountItems(nextEntries)
      range.replace(nextItems.flatMap(mountedForItemNodes))
      mountedState.fallback?.dispose()
      mountedState = { _tag: "items", items: nextItems }
      tracked = nextTracked
      syncTrackedSubscriptions(subscriptions, tracked.atoms, registry, render)
      return
    }
    const previousItemsByKey = new Map(mountedState.items.map((entry) => [entry.key, entry]))
    const nextItems = nextEntries.map(([key, item, index]) => {
      const existing = previousItemsByKey.get(key)
      if (existing === undefined) {
        return makeMountedForItem(key, item, index, mountNode(node.render(item, index), registry, root))
      }
      previousItemsByKey.delete(key)
      if (existing.item !== item) {
        replaceMountedForItem(existing, item, index, mountNode(node.render(item, index), registry, root))
      } else {
        existing.index = index
      }
      return existing
    })
    const parent = resolveRangeParent(range.owner, range.start, range.end)
    let anchor = range.end
    for (let index = nextItems.length - 1; index >= 0; index--) {
      const entry = nextItems[index]
      if (entry === undefined) {
        continue
      }
      if (entry.range.start.parentNode === parent && entry.range.end.parentNode === parent) {
        moveRangeBefore(entry.range.owner, entry.range.start, entry.range.end, anchor)
      } else {
        insertNodesBefore(parent, anchor, mountedForItemNodes(entry))
      }
      anchor = entry.range.start
    }
    for (const leftover of previousItemsByKey.values()) {
      detachMountedForItem(leftover)
      disposeMountedForItem(leftover)
    }
    mountedState = { _tag: "items", items: nextItems }
    tracked = nextTracked
    syncTrackedSubscriptions(subscriptions, tracked.atoms, registry, render)
  }
  syncTrackedSubscriptions(subscriptions, tracked.atoms, registry, render)
  return {
    nodes: [
      range.start,
      ...(mountedState._tag === "empty"
        ? mountedState.fallback === undefined ? [] : mountedState.fallback.nodes
        : mountedState.items.flatMap(mountedForItemNodes)),
      range.end,
    ],
    hasReactiveBindings: tracked.atoms.size > 0 || (mountedState._tag === "empty"
      ? mountedState.fallback?.hasReactiveBindings === true
      : mountedState.items.some((item) => item.mounted.hasReactiveBindings)),
    dispose: () => {
      disposed = true
      for (const unsubscribe of subscriptions.values()) {
        unsubscribe()
      }
      subscriptions.clear()
      if (mountedState._tag === "empty") {
        mountedState.fallback?.dispose()
        return
      }
      for (let index = mountedState.items.length - 1; index >= 0; index--) {
        const entry = mountedState.items[index]
        if (entry !== undefined) {
          disposeMountedForItem(entry)
        }
      }
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
    case "If":
      return mountIfNode(node, registry, root)
    case "For":
      return mountForNode(node, registry, root)
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
      if (node.attributes.value !== undefined) {
        setValueProperty(element, node.attributes.value, { lastWrittenValue: undefined })
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
