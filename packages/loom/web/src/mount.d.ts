import { AtomRegistry } from "effect/unstable/reactivity"
import type * as Component from "./component.js"

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

/**
 * Minimal vNext mount seam.
 *
 * This keeps the new public entrypoint additive while the full interactive DOM runtime lands later.
 */
export declare const mount: <
  const Components extends Readonly<Record<string, Component.Type<any, any, any, any, any, any>>>,
  Entry extends EntryOf<Components> = EntryOf<Components>,
>(
  components: Components,
  options?: Omit<Options, "entry"> & { readonly entry?: Entry },
) => Handle<MountedModel<Components, Entry>, MountedActions<Components, Entry>>
