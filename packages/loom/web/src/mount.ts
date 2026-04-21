import { AtomRegistry } from "effect/unstable/reactivity"
import * as Component from "./component.js"
import { instantiate } from "./component.js"
import * as Html from "./html.js"
import { type MountedView, mountView } from "./internal/mounted-view.js"

export interface Options {
  readonly entry?: string
  readonly root?: Element
  readonly registry?: AtomRegistry.AtomRegistry
}

type EntryOf<Components> = Extract<keyof Components, string>
type MountedComponent<Components, Entry extends EntryOf<Components>> = Components[Entry]
type MountedModel<Components, Entry extends EntryOf<Components>> = MountedComponent<Components, Entry> extends
  Component.Type<any, any, any, infer Model, any, any> ? Model : {}
type MountedActions<Components, Entry extends EntryOf<Components>> = MountedComponent<Components, Entry> extends
  Component.Type<any, any, any, any, infer Actions, any> ? Actions : {}

export interface Handle<
  Model extends Component.ModelShape = {},
  Actions extends Component.ActionShape = {},
> {
  readonly components: Readonly<Record<string, Component.Type<any, any, any, any, any, any>>>
  readonly entry: string
  readonly component: Component.Type<any, any, any, Model, Actions, any>
  readonly model: Component.WriteModel<Model>
  readonly state: Component.State<Model>
  readonly actions: Actions
  readonly html: string
  readonly sync: () => string
  readonly root: Element | undefined
  readonly registry: AtomRegistry.AtomRegistry
  readonly observability: Observability<Actions>
  readonly dispose: () => void
}

export type ComponentRecord = Readonly<Record<string, Component.Type<any, any, any, any, any, any>>>

export interface MountMetadata {
  readonly entry: string
  readonly componentName: string | undefined
  readonly modelKeys: ReadonlyArray<string>
  readonly actionNames: ReadonlyArray<string>
  readonly slotNames: ReadonlyArray<string>
}

export interface ActionObservation {
  readonly name: string
  readonly componentName: string | undefined
  readonly invocations: number
  readonly lastResult: "void" | "value" | "effect" | undefined
  readonly lastAnnotations: Component.ActionAnnotations | undefined
}

export type ActionObservationMap<Actions extends Component.ActionShape> =
  & {
    readonly [Key in Extract<keyof Actions, string>]: ActionObservation
  }
  & Readonly<Record<string, ActionObservation>>

export interface Observability<Actions extends Component.ActionShape = {}> {
  readonly mount: MountMetadata
  readonly actions: ActionObservationMap<Actions>
}

type MutableActionObservation = {
  -readonly [Key in keyof ActionObservation]: ActionObservation[Key]
}

/**
 * Minimal vNext mount seam.
 *
 * This keeps the new public entrypoint additive while the full interactive DOM runtime lands later.
 */
export const mount = <
  const Components extends Readonly<Record<string, Component.Type<any, any, any, any, any, any>>>,
  Entry extends EntryOf<Components> = EntryOf<Components>,
>(
  components: Components,
  options?: Omit<Options, "entry"> & { readonly entry?: Entry },
): Handle<MountedModel<Components, Entry>, MountedActions<Components, Entry>> => {
  const entries = Object.entries(components)

  if (entries.length === 0) {
    throw new Error("mount requires at least one component")
  }

  const entry = options?.entry ?? entries[0]?.[0]

  if (entry === undefined) {
    throw new Error("mount could not resolve an entry component")
  }

  const component = components[entry] as MountedComponent<Components, Entry>

  if (component === undefined) {
    throw new Error(`mount could not find component '${entry}'`)
  }

  const registry = options?.registry ?? component.registry ?? AtomRegistry.make()
  const ownsRegistry = options?.registry === undefined && component.registry === undefined
  const instance = instantiate(component, registry)
  const actionNames = Object.keys(instance.actions)
  const observabilityActions = Object.fromEntries(
    actionNames.map((name) => [
      name,
      {
        name,
        componentName: component.name,
        invocations: 0,
        lastResult: undefined,
        lastAnnotations: undefined,
      },
    ]),
  ) as ActionObservationMap<MountedActions<Components, Entry>> & Record<string, MutableActionObservation>
  const observability: Observability<MountedActions<Components, Entry>> = {
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
  let mountedView: MountedView | undefined
  let disposed = false

  const observeAction = (name: string, result: unknown): void => {
    const observation = observabilityActions[name] as MutableActionObservation | undefined

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
        ? (...args: ReadonlyArray<unknown>) => {
          const result = action(...args)
          observeAction(key, result)

          if (options?.root === undefined || mountedView?.hasReactiveBindings !== true) {
            sync()
          }

          return result
        }
        : action,
    ]),
  ) as typeof instance.actions

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
