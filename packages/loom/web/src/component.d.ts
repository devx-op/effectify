import { Atom, AtomRegistry } from "effect/unstable/reactivity"
import * as LoomCore from "@effectify/loom-core"
import type * as Effect from "effect/Effect"
import type * as Pipeable from "effect/Pipeable"
import type * as Diagnostics from "./diagnostics.js"
import type * as Slot from "./slot.js"
import type * as View from "./view.js"
export type ModelValueInput = unknown | Atom.Atom<unknown> | (() => unknown)
export type ModelShape = Readonly<Record<string, ModelValueInput>>
export type ActionShape = Readonly<Record<string, unknown>>
export type SlotShape = Readonly<Record<string, Slot.Definition>>
export interface ActionAnnotations {
  readonly label?: string
  readonly details?: {
    readonly [key: string]: Diagnostics.JsonValue
  }
}
export interface ActionEffect<Success = unknown, Err = never, Requirements = never> {
  readonly _tag: "LoomActionEffect"
  readonly effect: Effect.Effect<Success, Err, Requirements>
  readonly annotations?: ActionAnnotations
}
type ActionOutputError<Output> = Output extends ActionEffect<any, infer Err, any> ? Err
  : Output extends Effect.Effect<any, infer Err, any> ? Err
  : never
type ActionOutputRequirements<Output> = Output extends ActionEffect<any, any, infer Requirements> ? Requirements
  : Output extends Effect.Effect<any, any, infer Requirements> ? Requirements
  : never
type ActionError<Actions extends ActionShape> = {
  readonly [Key in keyof Actions]: Actions[Key] extends (...args: ReadonlyArray<any>) => infer Output
    ? ActionOutputError<Output>
    : never
}[keyof Actions]
type ActionRequirements<Actions extends ActionShape> = {
  readonly [Key in keyof Actions]: Actions[Key] extends (...args: ReadonlyArray<any>) => infer Output
    ? ActionOutputRequirements<Output>
    : never
}[keyof Actions]
type RequiredSlotKeys<Slots extends SlotShape> = {
  readonly [Key in keyof Slots]: Slots[Key]["required"] extends true ? Key : never
}[keyof Slots]
type OptionalSlotKeys<Slots extends SlotShape> = Exclude<keyof Slots, RequiredSlotKeys<Slots>>
type MaterializedValue<Value> = Value extends () => infer Produced ? MaterializedValue<Produced> : Value
type StateValue<Value> = MaterializedValue<Value> extends Atom.Atom<infer AtomValue> ? AtomValue
  : MaterializedValue<Value>
export interface WritableAtom<Value> {
  readonly atom: Atom.Writable<Value>
  readonly get: () => Value
  readonly set: (value: Value) => void
  readonly update: (update: (value: Value) => Value) => void
}
type WritableValue<Value> = MaterializedValue<Value> extends Atom.Writable<infer AtomValue> ? WritableAtom<AtomValue>
  : MaterializedValue<Value>
export type State<Model extends ModelShape> = {
  readonly [Key in keyof Model]: StateValue<Model[Key]>
}
export type WriteModel<Model extends ModelShape> = {
  readonly [Key in keyof Model]: WritableValue<Model[Key]>
}
export type MaterializedModel<Model extends ModelShape> = {
  readonly [Key in keyof Model]: MaterializedValue<Model[Key]>
}
export type SlotAssignments<Slots extends SlotShape> = {
  readonly [Key in keyof Slots]: Slots[Key]["required"] extends true ? View.Child : View.Child | undefined
}
export type SlotInput<Slots extends SlotShape> = Readonly<
  & {
    readonly [Key in RequiredSlotKeys<Slots>]: View.Child
  }
  & {
    readonly [Key in OptionalSlotKeys<Slots>]?: View.Child
  }
>
type RuntimeSlotInput = Readonly<Record<string, View.Child | undefined>>
export interface ActionContext<Model extends ModelShape> {
  readonly model: WriteModel<Model>
  readonly state: State<Model>
  readonly registry: AtomRegistry.AtomRegistry
  readonly component: {
    readonly name: string | undefined
  }
}
export type ActionBindingContext<Model extends ModelShape> = WriteModel<Model> & ActionContext<Model>
export type ActionSpec<Model extends ModelShape> = Readonly<
  Record<string, (context: ActionBindingContext<Model>) => unknown>
>
export type BoundActions<Spec extends ActionSpec<Model>, Model extends ModelShape> = {
  readonly [Key in keyof Spec]: () => ReturnType<Spec[Key]>
}
type ActionsInput<Model extends ModelShape, Actions extends ActionShape> =
  | Actions
  | ((context: ActionContext<Model>) => Actions)
  | ActionSpec<Model>
export interface ViewContext<Props, Model extends ModelShape, Actions extends ActionShape, Slots extends SlotShape>
  extends ActionContext<Model>
{
  readonly props: Props | undefined
  readonly actions: Actions
  readonly slots: SlotAssignments<Slots>
}
/** Public Loom component definition. */
export interface Type<
  Props = never,
  Err = never,
  Requirements = never,
  Model extends ModelShape = {},
  Actions extends ActionShape = {},
  Slots extends SlotShape = {},
> extends LoomCore.Component.Definition, Pipeable.Pipeable {
  readonly name?: string
  readonly model?: Model
  readonly actions?: ActionsInput<Model, Actions>
  readonly slots?: Slots
  readonly registry?: AtomRegistry.AtomRegistry
  readonly render?: (context: ViewContext<Props, Model, Actions, Slots>) => View.Node
  readonly __props?: Props
  readonly __error?: Err
  readonly __requirements?: Requirements
}
export type ModelOf<ComponentType extends Type<any, any, any, any, any, any>> = ComponentType extends
  Type<any, any, any, infer Model, any, any> ? Model : {}
export type ActionsOf<ComponentType extends Type<any, any, any, any, any, any>> = ComponentType extends
  Type<any, any, any, any, infer Actions, any> ? Actions : {}
/** Public Loom component capability. */
export type Capability = LoomCore.Component.Capability
export declare const isActionEffect: (value: unknown) => value is ActionEffect
export interface Instance<Model extends ModelShape, Actions extends ActionShape, Slots extends SlotShape> {
  readonly registry: AtomRegistry.AtomRegistry
  readonly model: WriteModel<Model>
  readonly state: State<Model>
  readonly actions: Actions
  readonly slots: SlotAssignments<Slots>
  readonly render: (actions?: Actions) => View.Node
}
export declare const instantiate: <
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
>(
  component: Type<Props, Err, Requirements, Model, Actions, Slots>,
  registry?: AtomRegistry.AtomRegistry,
  props?: Props,
  slotInput?: RuntimeSlotInput,
) => Instance<Model, Actions, Slots>
/** Create a component from a neutral AST node or a named vNext component seam. */
export declare function make(name: string): Type
export declare function make(node: LoomCore.Ast.Node): Type
/** Backwards-compatible alias kept while the public API settles. */
export declare const fromNode: typeof make
/** Create an Effect-backed component capability. */
export declare const effect: (componentEffect: LoomCore.Component.EffectLike) => Capability
/** Explicitly represent Effect-like action work while preserving Err and Requirements inference. */
export declare const actionEffect: <Success, Err, Requirements>(
  effect: Effect.Effect<Success, Err, Requirements>,
  annotations?: ActionAnnotations,
) => ActionEffect<Success, Err, Requirements>
/** Attach model atoms and values to a component definition. */
export declare function model<Model extends ModelShape>(
  modelDefinition: Model,
): <Props, Err, Requirements, Actions extends ActionShape, Slots extends SlotShape>(
  self: Type<Props, Err, Requirements, {}, Actions, Slots>,
) => Type<Props, Err, Requirements, Model, Actions, Slots>
export declare function model<
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
>(
  self: Type<Props, Err, Requirements, {}, Actions, Slots>,
  modelDefinition: Model,
): Type<Props, Err, Requirements, Model, Actions, Slots>
/** Attach action definitions or factories to a component definition. */
export declare function actions<Model extends ModelShape, Spec extends ActionSpec<Model>>(
  actionDefinition: Spec,
): <Props, Err, Requirements, Slots extends SlotShape>(
  self: Type<Props, Err, Requirements, Model, {}, Slots>,
) => Type<
  Props,
  Err | ActionError<BoundActions<Spec, Model>>,
  Requirements | ActionRequirements<BoundActions<Spec, Model>>,
  Model,
  BoundActions<Spec, Model>,
  Slots
>
export declare function actions<
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Spec extends ActionSpec<Model>,
  Slots extends SlotShape,
>(
  self: Type<Props, Err, Requirements, Model, {}, Slots>,
  actionDefinition: Spec,
): Type<
  Props,
  Err | ActionError<BoundActions<Spec, Model>>,
  Requirements | ActionRequirements<BoundActions<Spec, Model>>,
  Model,
  BoundActions<Spec, Model>,
  Slots
>
export declare function actions<Model extends ModelShape, Actions extends ActionShape>(
  actionDefinition: ActionsInput<Model, Actions>,
): <Props, Err, Requirements, Slots extends SlotShape>(
  self: Type<Props, Err, Requirements, Model, {}, Slots>,
) => Type<Props, Err | ActionError<Actions>, Requirements | ActionRequirements<Actions>, Model, Actions, Slots>
export declare function actions<
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
>(
  self: Type<Props, Err, Requirements, Model, {}, Slots>,
  actionDefinition: ActionsInput<Model, Actions>,
): Type<Props, Err | ActionError<Actions>, Requirements | ActionRequirements<Actions>, Model, Actions, Slots>
/** Attach a renderer-neutral view renderer to a component definition. */
export declare function view<Model extends ModelShape, Actions extends ActionShape, Slots extends SlotShape>(
  render: (context: ViewContext<never, Model, Actions, Slots>) => View.Node,
): <Props, Err, Requirements>(
  self: Type<Props, Err, Requirements, Model, Actions, Slots>,
) => Type<Props, Err, Requirements, Model, Actions, Slots>
export declare function view<
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
>(
  self: Type<Props, Err, Requirements, Model, Actions, Slots>,
  render: (context: ViewContext<Props, Model, Actions, Slots>) => View.Node,
): Type<Props, Err, Requirements, Model, Actions, Slots>
/** Attach slot contracts to a component definition. */
export declare function slots<Slots extends SlotShape>(
  slotDefinition: Slots,
): <Props, Err, Requirements, Model extends ModelShape, Actions extends ActionShape>(
  self: Type<Props, Err, Requirements, Model, Actions, {}>,
) => Type<Props, Err, Requirements, Model, Actions, Slots>
export declare function slots<
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
>(
  self: Type<Props, Err, Requirements, Model, Actions, {}>,
  slotDefinition: Slots,
): Type<Props, Err, Requirements, Model, Actions, Slots>
/**
 * Attach a capability to a component or render a component use with props/slots.
 * Supports both legacy capability usage and vNext layout composition.
 */
export declare function use(capability: Capability): (self: Type) => Type
export declare function use(self: Type, capability: Capability): Type
export declare function use<
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
>(component: Type<Props, Err, Requirements, Model, Actions, Slots>, props: Props, slots: SlotInput<Slots>): View.Node
export declare function use<
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
>(component: Type<Props, Err, Requirements, Model, Actions, Slots>, props?: Props, slots?: SlotInput<Slots>): View.Node
