import { Atom, AtomRegistry } from "effect/unstable/reactivity"
import * as LoomCore from "@effectify/loom-core"
import type * as Effect from "effect/Effect"
import type * as Pipeable from "effect/Pipeable"
import type * as Diagnostics from "./diagnostics.js"
import * as pipeable from "./internal/pipeable.js"
import type * as Slot from "./slot.js"
import type * as View from "./view.js"

export type ModelValueInput = unknown | Atom.Atom<unknown> | (() => unknown)
export type ModelShape = Readonly<Record<string, ModelValueInput>>
export type ActionShape = Readonly<Record<string, unknown>>
export type SlotShape = Readonly<Record<string, Slot.Definition>>

export interface ActionAnnotations {
  readonly label?: string
  readonly details?: { readonly [key: string]: Diagnostics.JsonValue }
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
  & { readonly [Key in RequiredSlotKeys<Slots>]: View.Child }
  & { readonly [Key in OptionalSlotKeys<Slots>]?: View.Child }
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

const makePipeable = <
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
>(
  value: Omit<Type<Props, Err, Requirements, Model, Actions, Slots>, keyof Pipeable.Pipeable>,
): Type<Props, Err, Requirements, Model, Actions, Slots> => pipeable.make(value)

const emptyNode = LoomCore.Ast.fragment([])

const emptyActions: ActionShape = {}

const isNode = (value: string | LoomCore.Ast.Node): value is LoomCore.Ast.Node =>
  typeof value === "object" && value !== null && "_tag" in value

const isComponent = (value: unknown): value is Type =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "Component"

const isCapability = (value: unknown): value is Capability =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "ComponentEffect"

export const isActionEffect = (value: unknown): value is ActionEffect =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "LoomActionEffect"

const isModelFactory = (value: ModelValueInput): value is () => unknown =>
  typeof value === "function" && !Atom.isAtom(value)

const materializeModel = <Model extends ModelShape>(model: Model | undefined): MaterializedModel<Model> => {
  const entries = Object.entries(model ?? {}).map(([key, value]) => [
    key,
    isModelFactory(value) ? value() : value,
  ])

  return Object.fromEntries(entries) as MaterializedModel<Model>
}

const createState = <Model extends ModelShape>(
  model: MaterializedModel<Model>,
  registry: AtomRegistry.AtomRegistry,
): State<Model> => {
  const keys = Object.keys(model)

  return new Proxy({}, {
    get(_target, property) {
      if (typeof property !== "string") {
        return undefined
      }

      const value = model[property as keyof Model]
      return Atom.isAtom(value) ? registry.get(value) : value
    },
    has(_target, property) {
      return typeof property === "string" && keys.includes(property)
    },
    ownKeys() {
      return keys
    },
    getOwnPropertyDescriptor(_target, property) {
      if (typeof property !== "string" || !keys.includes(property)) {
        return undefined
      }

      return {
        configurable: true,
        enumerable: true,
      }
    },
  }) as State<Model>
}

const createWriteModel = <Model extends ModelShape>(
  model: MaterializedModel<Model>,
  registry: AtomRegistry.AtomRegistry,
): WriteModel<Model> => {
  const entries = Object.entries(model).map(([key, value]) => [
    key,
    typeof value === "object" && value !== null && Atom.isWritable(value)
      ? {
        atom: value,
        get: () => registry.get(value),
        set: (next: unknown) => registry.set(value, next),
        update: (update: (current: unknown) => unknown) => registry.update(value, update),
      }
      : value,
  ])

  return Object.fromEntries(entries) as WriteModel<Model>
}

const resolveSlots = <Slots extends SlotShape>(
  slots: Slots | undefined,
  values?: RuntimeSlotInput,
): SlotAssignments<Slots> => {
  const entries = Object.entries(slots ?? {}).map(([key, definition]) => {
    const slotValue = values?.[key]

    if (definition.required && values !== undefined && slotValue === undefined) {
      throw new Error(`missing required slot '${key}'`)
    }

    return [key, slotValue]
  })

  return Object.fromEntries(entries) as SlotAssignments<Slots>
}

const isActionSpec = <Model extends ModelShape>(value: unknown): value is ActionSpec<Model> => {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const entries = Object.values(value)

  return entries.length > 0 && entries.every((entry) => typeof entry === "function") &&
    entries.some((entry) => entry.length > 0)
}

const bindActionSpec = <Model extends ModelShape, Spec extends ActionSpec<Model>>(
  actionSpec: Spec,
  context: ActionBindingContext<Model>,
): BoundActions<Spec, Model> => {
  const entries = Object.entries(actionSpec).map(([key, action]) => [
    key,
    () => action(context),
  ])

  return Object.fromEntries(entries) as BoundActions<Spec, Model>
}

export interface Instance<Model extends ModelShape, Actions extends ActionShape, Slots extends SlotShape> {
  readonly registry: AtomRegistry.AtomRegistry
  readonly model: WriteModel<Model>
  readonly state: State<Model>
  readonly actions: Actions
  readonly slots: SlotAssignments<Slots>
  readonly render: (actions?: Actions) => View.Node
}

export const instantiate = <
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
>(
  component: Type<Props, Err, Requirements, Model, Actions, Slots>,
  registry: AtomRegistry.AtomRegistry = component.registry ?? AtomRegistry.make(),
  props?: Props,
  slotInput?: RuntimeSlotInput,
): Instance<Model, Actions, Slots> => {
  const materializedModel = materializeModel(component.model)
  const model = createWriteModel(materializedModel, registry)
  const state = createState(materializedModel, registry)
  const actionContext: ActionContext<Model> = {
    model,
    state,
    registry,
    component: {
      name: component.name,
    },
  }
  const actionBindingContext: ActionBindingContext<Model> = Object.assign({}, model, actionContext)
  const actionDefinition = component.actions
  const actions = (typeof actionDefinition === "function"
    ? actionDefinition(actionContext)
    : isActionSpec(actionDefinition)
    ? bindActionSpec(actionDefinition, actionBindingContext)
    : (actionDefinition ?? emptyActions)) as Actions
  const slots = resolveSlots(component.slots, slotInput)

  return {
    registry,
    model,
    state,
    actions,
    slots,
    render: (boundActions = actions) =>
      component.render === undefined
        ? component.node
        : component.render({
          ...actionContext,
          props,
          actions: boundActions,
          slots,
        }),
  }
}

const materialize = <
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
>(
  component: Type<Props, Err, Requirements, Model, Actions, Slots>,
): LoomCore.Ast.Node => {
  const instance = instantiate(component, component.registry ?? AtomRegistry.make())
  return instance.render()
}

const renderComponentUse = (
  component: Type<any, any, any, any, any, any>,
  props?: unknown,
  slots?: RuntimeSlotInput,
): View.Node =>
  instantiate(
    component,
    component.registry ?? AtomRegistry.make(),
    props,
    slots,
  ).render()

const reconcile = <
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
>(
  component: Type<Props, Err, Requirements, Model, Actions, Slots>,
): Type<Props, Err, Requirements, Model, Actions, Slots> =>
  makePipeable({
    ...component,
    registry: component.registry ?? AtomRegistry.make(),
    node: materialize(component),
  })

const patch = <
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
>(
  component: Type<Props, Err, Requirements, Model, Actions, Slots>,
  update: Partial<Omit<Type<Props, Err, Requirements, Model, Actions, Slots>, keyof Pipeable.Pipeable>>,
): Type<Props, Err, Requirements, Model, Actions, Slots> =>
  reconcile(makePipeable({
    ...component,
    ...update,
  }))

/** Create a component from a neutral AST node or a named vNext component seam. */
export function make(name: string): Type
export function make(node: LoomCore.Ast.Node): Type
export function make(input: string | LoomCore.Ast.Node): Type {
  const definition = LoomCore.Component.make(isNode(input) ? input : emptyNode)

  return reconcile(
    makePipeable({
      ...definition,
      name: typeof input === "string" ? input : undefined,
      registry: AtomRegistry.make(),
    }),
  )
}

/** Backwards-compatible alias kept while the public API settles. */
export const fromNode = make

/** Create an Effect-backed component capability. */
export const effect = (
  componentEffect: LoomCore.Component.EffectLike,
): Capability => LoomCore.Component.effect(componentEffect)

/** Explicitly represent Effect-like action work while preserving Err and Requirements inference. */
export const actionEffect = <Success, Err, Requirements>(
  effect: Effect.Effect<Success, Err, Requirements>,
  annotations?: ActionAnnotations,
): ActionEffect<Success, Err, Requirements> => ({
  _tag: "LoomActionEffect",
  effect,
  annotations,
})

/** Attach model atoms and values to a component definition. */
export function model<Model extends ModelShape>(
  modelDefinition: Model,
): <Props, Err, Requirements, Actions extends ActionShape, Slots extends SlotShape>(
  self: Type<Props, Err, Requirements, {}, Actions, Slots>,
) => Type<Props, Err, Requirements, Model, Actions, Slots>
export function model<
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
export function model<
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
>(
  selfOrModel: Type<Props, Err, Requirements, {}, Actions, Slots> | Model,
  modelDefinition?: Model,
) {
  if (modelDefinition === undefined) {
    return (self: Type<Props, Err, Requirements, {}, Actions, Slots>) => patch(self, { model: selfOrModel })
  }

  if (!isComponent(selfOrModel)) {
    return make(LoomCore.Ast.text(""))
  }

  return patch(selfOrModel, { model: modelDefinition })
}

/** Attach action definitions or factories to a component definition. */
export function actions<Model extends ModelShape, Spec extends ActionSpec<Model>>(
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
export function actions<
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
export function actions<Model extends ModelShape, Actions extends ActionShape>(
  actionDefinition: ActionsInput<Model, Actions>,
): <Props, Err, Requirements, Slots extends SlotShape>(
  self: Type<Props, Err, Requirements, Model, {}, Slots>,
) => Type<Props, Err | ActionError<Actions>, Requirements | ActionRequirements<Actions>, Model, Actions, Slots>
export function actions<
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
export function actions<
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
>(
  selfOrActions: Type<Props, Err, Requirements, Model, {}, Slots> | ActionsInput<Model, Actions>,
  actionDefinition?: ActionsInput<Model, Actions>,
) {
  if (actionDefinition === undefined) {
    return (self: Type<Props, Err, Requirements, Model, {}, Slots>) => patch(self, { actions: selfOrActions })
  }

  if (!isComponent(selfOrActions)) {
    return make(LoomCore.Ast.text(""))
  }

  return patch(selfOrActions, { actions: actionDefinition })
}

/** Attach a renderer-neutral view renderer to a component definition. */
export function view<Model extends ModelShape, Actions extends ActionShape, Slots extends SlotShape>(
  render: (context: ViewContext<never, Model, Actions, Slots>) => View.Node,
): <Props, Err, Requirements>(
  self: Type<Props, Err, Requirements, Model, Actions, Slots>,
) => Type<Props, Err, Requirements, Model, Actions, Slots>
export function view<
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
export function view(
  selfOrRender: Type | ((context: ViewContext<never, ModelShape, ActionShape, SlotShape>) => View.Node),
  render?: (context: ViewContext<never, ModelShape, ActionShape, SlotShape>) => View.Node,
) {
  if (render === undefined) {
    if (isComponent(selfOrRender)) {
      return selfOrRender
    }

    return (self: Type) => patch(self, { render: selfOrRender })
  }

  if (!isComponent(selfOrRender)) {
    return make(LoomCore.Ast.text(""))
  }

  return patch(selfOrRender, { render })
}

/** Attach slot contracts to a component definition. */
export function slots<Slots extends SlotShape>(
  slotDefinition: Slots,
): <Props, Err, Requirements, Model extends ModelShape, Actions extends ActionShape>(
  self: Type<Props, Err, Requirements, Model, Actions, {}>,
) => Type<Props, Err, Requirements, Model, Actions, Slots>
export function slots<
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
export function slots<
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
>(
  selfOrSlots: Type<Props, Err, Requirements, Model, Actions, {}> | Slots,
  slotDefinition?: Slots,
) {
  if (slotDefinition === undefined) {
    return (self: Type<Props, Err, Requirements, Model, Actions, {}>) => patch(self, { slots: selfOrSlots })
  }

  if (!isComponent(selfOrSlots)) {
    return make(LoomCore.Ast.text(""))
  }

  return patch(selfOrSlots, { slots: slotDefinition })
}

/**
 * Attach a capability to a component or render a component use with props/slots.
 * Supports both legacy capability usage and vNext layout composition.
 */
export function use(capability: Capability): (self: Type) => Type
export function use(self: Type, capability: Capability): Type
export function use<
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
>(
  component: Type<Props, Err, Requirements, Model, Actions, Slots>,
  props: Props,
  slots: SlotInput<Slots>,
): View.Node
export function use<
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
>(
  component: Type<Props, Err, Requirements, Model, Actions, Slots>,
  props?: Props,
  slots?: SlotInput<Slots>,
): View.Node
export function use(
  selfOrCapability: Type | Capability,
  capabilityOrProps?: Capability | unknown,
  slotInput?: SlotInput<SlotShape>,
) {
  if (capabilityOrProps === undefined) {
    if (selfOrCapability._tag === "Component" && slotInput !== undefined) {
      return renderComponentUse(selfOrCapability, undefined, slotInput)
    }

    if (selfOrCapability._tag === "ComponentEffect") {
      return (self: Type): Type =>
        reconcile(
          makePipeable({
            ...self,
            ...LoomCore.Component.use(self, selfOrCapability),
          }),
        )
    }

    return (self: Type): Type => self
  }

  if (selfOrCapability._tag === "Component") {
    if (isCapability(capabilityOrProps)) {
      return reconcile(
        makePipeable({
          ...selfOrCapability,
          ...LoomCore.Component.use(selfOrCapability, capabilityOrProps),
        }),
      )
    }

    return renderComponentUse(selfOrCapability, capabilityOrProps, slotInput)
  }

  return make(LoomCore.Ast.text(""))
}
