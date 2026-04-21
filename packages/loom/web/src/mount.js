import { AtomRegistry } from "effect/unstable/reactivity"
import * as Component from "./component.js"
import { instantiate } from "./component.js"
import * as Html from "./html.js"
import { mountView } from "./internal/mounted-view.js"
/**
 * Minimal vNext mount seam.
 *
 * This keeps the new public entrypoint additive while the full interactive DOM runtime lands later.
 */
export const mount = (components, options) => {
  const entries = Object.entries(components)
  if (entries.length === 0) {
    throw new Error("mount requires at least one component")
  }
  const entry = options?.entry ?? entries[0]?.[0]
  if (entry === undefined) {
    throw new Error("mount could not resolve an entry component")
  }
  const component = components[entry]
  if (component === undefined) {
    throw new Error(`mount could not find component '${entry}'`)
  }
  const registry = options?.registry ?? component.registry ?? AtomRegistry.make()
  const ownsRegistry = options?.registry === undefined && component.registry === undefined
  const instance = instantiate(component, registry)
  const actionNames = Object.keys(instance.actions)
  const observabilityActions = Object.fromEntries(actionNames.map((name) => [
    name,
    {
      name,
      componentName: component.name,
      invocations: 0,
      lastResult: undefined,
      lastAnnotations: undefined,
    },
  ]))
  const observability = {
    mount: {
      entry,
      componentName: component.name,
      modelKeys: Object.keys(component.model ?? {}),
      actionNames,
      slotNames: Object.keys(component.slots ?? {}),
    },
    actions: observabilityActions,
  }
  let html = ""
  let mountedView
  let disposed = false
  const observeAction = (name, result) => {
    const observation = observabilityActions[name]
    if (observation === undefined) {
      return
    }
    observation.invocations += 1
    observation.lastResult = result === undefined
      ? "void"
      : Component.isActionEffect(result)
      ? "effect"
      : "value"
    observation.lastAnnotations = Component.isActionEffect(result) ? result.annotations : undefined
  }
  const sync = () => {
    if (disposed) {
      return options?.root?.innerHTML ?? html
    }
    const rendered = instance.render(actions)
    if (options?.root !== undefined) {
      mountedView?.dispose()
      mountedView = mountView(options.root, rendered, registry)
      html = options.root.innerHTML
    } else {
      html = Html.renderToString(rendered, { registry })
    }
    return html
  }
  const actions = Object.fromEntries(
    Object.entries(instance.actions).map(([key, action]) => [
      key,
      typeof action === "function"
        ? (...args) => {
          const result = action(...args)
          observeAction(key, result)
          if (options?.root === undefined || mountedView?.hasReactiveBindings !== true) {
            sync()
          }
          return result
        }
        : action,
    ]),
  )
  sync()
  return {
    components,
    entry,
    component,
    model: instance.model,
    state: instance.state,
    actions,
    get html() {
      return options?.root?.innerHTML ?? html
    },
    sync,
    root: options?.root,
    registry,
    observability,
    dispose: () => {
      if (disposed) {
        return
      }
      disposed = true
      mountedView?.dispose()
      if (ownsRegistry) {
        registry.dispose()
      }
    },
  }
}
