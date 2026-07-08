import { Atom, AtomRegistry } from "effect/unstable/reactivity"
import * as LoomCore from "@effectify/loom-core"
import type * as Effect from "effect/Effect"
import type * as Pipeable from "effect/Pipeable"
import type * as Diagnostics from "./diagnostics.js"
import * as pipeable from "./internal/pipeable.js"
import { brandStateAccessor, type StateAccessor, trackStateAtomRead } from "./internal/tracked-state.js"
import * as viewChild from "./internal/view-child.js"
import type * as Slot from "./slot.js"
import * as Template from "./template.js"
import type * as View from "./view.js"

export type ModelValueInput = unknown | Atom.Atom<unknown> | (() => unknown)
export type ModelShape = Readonly<Record<string, ModelValueInput>>
export type StateDefinition = ModelShape
export type ActionShape = Readonly<Record<string, unknown>>
export type SlotShape = Readonly<Record<string, Slot.Definition>>
type ChildrenFlag = true | false
type MergeModel<Model extends ModelShape, Added extends ModelShape> = Omit<Model, keyof Added> & Added

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
  readonly [Key in keyof Model]: MaterializedValue<Model[Key]> extends Atom.Atom<infer AtomValue>
    ? StateAccessor<AtomValue>
    : () => StateValue<Model[Key]>
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
type RuntimeFields = {
  readonly registry?: AtomRegistry.AtomRegistry
}
type RuntimeType<
  Props = never,
  Err = never,
  Requirements = never,
  Model extends ModelShape = {},
  Actions extends ActionShape = {},
  Slots extends SlotShape = {},
  AcceptsChildren extends ChildrenFlag = true,
> = Component<Props, Err, Requirements, Model, Actions, Slots, AcceptsChildren> & RuntimeFields

export interface ActionContext<Model extends ModelShape> {
  readonly model: WriteModel<Model>
  readonly state: State<Model>
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
  readonly children: View.ViewChild | undefined
  readonly slots: SlotAssignments<Slots>
}

/** Public Loom component definition. */
export interface Component<
  Props = never,
  Err = never,
  Requirements = never,
  Model extends ModelShape = {},
  Actions extends ActionShape = {},
  Slots extends SlotShape = {},
  _AcceptsChildren extends ChildrenFlag = true,
> extends LoomCore.Component.Component, Pipeable.Pipeable {
  readonly name?: string
  readonly model?: Model
  readonly state?: StateDefinition
  readonly actions?: ActionsInput<Model, Actions>
  readonly children?: true
  readonly slots?: Slots
  readonly render?: (context: ViewContext<Props, Model, Actions, Slots>) => Template.Renderable<any, any>
  readonly __props?: Props
  readonly __error?: Err
  readonly __requirements?: Requirements
}

/** Backwards-compatible alias kept while the public API settles. */
export type Type<
  Props = never,
  Err = never,
  Requirements = never,
  Model extends ModelShape = {},
  Actions extends ActionShape = {},
  Slots extends SlotShape = {},
  AcceptsChildren extends ChildrenFlag = true,
> = Component<Props, Err, Requirements, Model, Actions, Slots, AcceptsChildren>

export type ModelOf<ComponentType extends Component<any, any, any, any, any, any, any>> = ComponentType extends
  Component<any, any, any, infer Model, any, any, any> ? Model : {}

export type ActionsOf<ComponentType extends Component<any, any, any, any, any, any, any>> = ComponentType extends
  Component<any, any, any, any, infer Actions, any, any> ? Actions : {}

/** Public Loom component capability. */
export type Capability = LoomCore.Component.Capability

const makePipeable = <
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
  AcceptsChildren extends ChildrenFlag,
>(
  value: Omit<RuntimeType<Props, Err, Requirements, Model, Actions, Slots, AcceptsChildren>, keyof Pipeable.Pipeable>,
): RuntimeType<Props, Err, Requirements, Model, Actions, Slots, AcceptsChildren> => pipeable.make(value)

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

const splitModelDefinition = (model: ModelShape | undefined): {
  readonly shared: StateDefinition
  readonly localFactory: (() => StateDefinition) | undefined
} => {
  const sharedEntries: Array<readonly [string, unknown]> = []
  const localEntries: Array<readonly [string, () => unknown]> = []

  for (const [key, value] of Object.entries(model ?? {})) {
    if (isModelFactory(value)) {
      localEntries.push([key, value])
      continue
    }

    sharedEntries.push([key, value])
  }

  return {
    shared: Object.fromEntries(sharedEntries),
    localFactory: localEntries.length === 0
      ? undefined
      : () =>
        Object.fromEntries(
          localEntries.map(([key, materialize]) => [key, materialize()]),
        ),
  }
}

const mergeStateFactory = (
  current: (() => StateDefinition) | undefined,
  next: (() => StateDefinition) | undefined,
): (() => StateDefinition) | undefined => {
  if (current === undefined) {
    return next
  }

  if (next === undefined) {
    return current
  }

  return () => ({
    ...current(),
    ...next(),
  })
}

const resolveSharedStateDefinition = (component: RuntimeType<any, any, any, any, any, any, any>): StateDefinition => {
  const compatibility = splitModelDefinition(component.model)
  const authoredState = splitModelDefinition(component.state)

  return {
    ...compatibility.shared,
    ...authoredState.shared,
  }
}

const materializeStateFactoryDefinition = (
  component: RuntimeType<any, any, any, any, any, any, any>,
): StateDefinition => {
  const compatibility = splitModelDefinition(component.model)
  const authoredState = splitModelDefinition(component.state)

  return mergeStateFactory(compatibility.localFactory, authoredState.localFactory)?.() ?? {}
}

const renderRegistryStack: Array<AtomRegistry.AtomRegistry> = []

const withRenderRegistry = <Value>(registry: AtomRegistry.AtomRegistry, evaluate: () => Value): Value => {
  renderRegistryStack.push(registry)

  try {
    return evaluate()
  } finally {
    renderRegistryStack.pop()
  }
}

const getCurrentRenderRegistry = (): AtomRegistry.AtomRegistry | undefined => renderRegistryStack.at(-1)

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
      return Atom.isAtom(value)
        ? brandStateAccessor(() => {
          trackStateAtomRead(value)
          return registry.get(value)
        })
        : () => value
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
    const slotValue = normalizeComposedViewChild(values?.[key])

    if (definition.required && values !== undefined && slotValue === undefined) {
      throw new Error(`missing required slot '${key}'`)
    }

    return [key, slotValue]
  })

  return Object.fromEntries(entries) as SlotAssignments<Slots>
}

const normalizeComposedViewChild = (child: View.ViewChild | undefined): View.ViewChild | undefined =>
  Array.isArray(child)
    ? Template.renderable(LoomCore.Ast.fragment(viewChild.normalizeViewChild(child)))
    : child

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
  readonly children: View.ViewChild | undefined
  readonly slots: SlotAssignments<Slots>
  readonly render: (actions?: Actions) => View.Node
}

interface InstanceCompositionInput {
  readonly children?: View.ViewChild
  readonly slots?: RuntimeSlotInput
}

export const instantiate = <
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
  AcceptsChildren extends ChildrenFlag,
>(
  component: Type<Props, Err, Requirements, Model, Actions, Slots, AcceptsChildren>,
  registry: AtomRegistry.AtomRegistry = (component as RuntimeType<
    Props,
    Err,
    Requirements,
    Model,
    Actions,
    Slots,
    AcceptsChildren
  >).registry ?? AtomRegistry.make(),
  props?: Props,
  compositionInput?: InstanceCompositionInput,
): Instance<Model, Actions, Slots> => {
  const materializedModel = {
    ...resolveSharedStateDefinition(component),
    ...materializeStateFactoryDefinition(component),
  } as MaterializedModel<Model>
  const model = createWriteModel(materializedModel, registry)
  const state = createState(materializedModel, registry)
  const actionContext: ActionContext<Model> = {
    model,
    state,
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
  const children = normalizeComposedViewChild(compositionInput?.children)
  const slots = resolveSlots(component.slots, compositionInput?.slots)

  return {
    registry,
    model,
    state,
    actions,
    children,
    slots,
    render: (boundActions = actions) =>
      withRenderRegistry(
        registry,
        () =>
          component.render === undefined
            ? component.node
            : component.render({
              ...actionContext,
              props,
              actions: boundActions,
              children,
              slots,
            }),
      ),
  }
}

const materialize = <
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
  AcceptsChildren extends ChildrenFlag,
>(
  component: RuntimeType<Props, Err, Requirements, Model, Actions, Slots, AcceptsChildren>,
): LoomCore.Ast.Node => {
  const instance = instantiate(component, component.registry ?? AtomRegistry.make())
  return instance.render()
}

const renderComponentUse = (
  component: RuntimeType<any, any, any, any, any, any, any>,
  props?: unknown,
  compositionInput?: InstanceCompositionInput,
): Template.Renderable<any, any> =>
  Template.renderable(
    instantiate(
      component,
      getCurrentRenderRegistry() ?? component.registry ?? AtomRegistry.make(),
      props,
      compositionInput,
    ).render(),
  )

const reconcile = <
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
  AcceptsChildren extends ChildrenFlag,
>(
  component: RuntimeType<Props, Err, Requirements, Model, Actions, Slots, AcceptsChildren>,
): Type<Props, Err, Requirements, Model, Actions, Slots, AcceptsChildren> =>
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
  AcceptsChildren extends ChildrenFlag,
>(
  component: RuntimeType<Props, Err, Requirements, Model, Actions, Slots, AcceptsChildren>,
  update: Partial<
    Omit<RuntimeType<Props, Err, Requirements, Model, Actions, Slots, AcceptsChildren>, keyof Pipeable.Pipeable>
  >,
): Type<Props, Err, Requirements, Model, Actions, Slots, AcceptsChildren> =>
  reconcile(makePipeable({
    ...component,
    ...update,
  }))

/** Create a component from a neutral AST node or a named vNext component seam. */
export function make(): Type
export function make(name: string): Type
export function make(node: LoomCore.Ast.Node): Type
export function make(input?: string | LoomCore.Ast.Node): Type {
  const definition = LoomCore.Component.make(input !== undefined && isNode(input) ? input : emptyNode)

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

/** Attach shared state values and atoms to a component definition. */
export function state<Added extends StateDefinition>(
  stateDefinition: Added,
): <
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
  AcceptsChildren extends ChildrenFlag,
>(
  self: Type<Props, Err, Requirements, Model, Actions, Slots, AcceptsChildren>,
) => Type<Props, Err, Requirements, MergeModel<Model, Added>, Actions, Slots, AcceptsChildren>
export function state<
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Added extends StateDefinition,
  Actions extends ActionShape,
  Slots extends SlotShape,
  AcceptsChildren extends ChildrenFlag,
>(
  self: Type<Props, Err, Requirements, Model, Actions, Slots, AcceptsChildren>,
  stateDefinition: Added,
): Type<Props, Err, Requirements, MergeModel<Model, Added>, Actions, Slots, AcceptsChildren>
export function state<Added extends StateDefinition>(
  selfOrState: Type | Added,
  stateDefinition?: Added,
) {
  if (stateDefinition === undefined) {
    if (isComponent(selfOrState)) {
      return selfOrState
    }

    return (self: Type) =>
      patch(self, {
        state: {
          ...self.state,
          ...selfOrState,
        },
      })
  }

  if (!isComponent(selfOrState)) {
    return make(LoomCore.Ast.text(""))
  }

  return patch(selfOrState, {
    state: {
      ...selfOrState.state,
      ...stateDefinition,
    },
  })
}

/** Attach model atoms and values to a component definition. */
export function model<Model extends ModelShape>(
  modelDefinition: Model,
): <
  Props,
  Err,
  Requirements,
  ExistingModel extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
  AcceptsChildren extends ChildrenFlag,
>(
  self: Type<Props, Err, Requirements, ExistingModel, Actions, Slots, AcceptsChildren>,
) => Type<Props, Err, Requirements, MergeModel<ExistingModel, Model>, Actions, Slots, AcceptsChildren>
export function model<
  Props,
  Err,
  Requirements,
  ExistingModel extends ModelShape,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
  AcceptsChildren extends ChildrenFlag,
>(
  self: Type<Props, Err, Requirements, ExistingModel, Actions, Slots, AcceptsChildren>,
  modelDefinition: Model,
): Type<Props, Err, Requirements, MergeModel<ExistingModel, Model>, Actions, Slots, AcceptsChildren>
export function model<
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
  AcceptsChildren extends ChildrenFlag,
>(
  selfOrModel: Type<any, any, any, ModelShape, Actions, Slots, AcceptsChildren> | Model,
  modelDefinition?: Model,
) {
  if (modelDefinition === undefined) {
    if (isComponent(selfOrModel)) {
      return selfOrModel
    }

    const legacyModel = selfOrModel as Model

    return (self: Type<any, any, any, ModelShape, Actions, Slots, AcceptsChildren>) => {
      return patch(self, {
        model: legacyModel,
        state: {
          ...self.state,
          ...legacyModel,
        },
      })
    }
  }

  if (!isComponent(selfOrModel)) {
    return make(LoomCore.Ast.text(""))
  }

  return patch(selfOrModel, {
    model: modelDefinition,
    state: {
      ...selfOrModel.state,
      ...modelDefinition,
    },
  })
}

/** Attach action definitions or factories to a component definition. */
export function actions<Model extends ModelShape, Spec extends ActionSpec<Model>>(
  actionDefinition: Spec,
): <Props, Err, Requirements, Slots extends SlotShape, AcceptsChildren extends ChildrenFlag>(
  self: Type<Props, Err, Requirements, Model, {}, Slots, AcceptsChildren>,
) => Type<
  Props,
  Err | ActionError<BoundActions<Spec, Model>>,
  Requirements | ActionRequirements<BoundActions<Spec, Model>>,
  Model,
  BoundActions<Spec, Model>,
  Slots,
  AcceptsChildren
>
export function actions<
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Spec extends ActionSpec<Model>,
  Slots extends SlotShape,
  AcceptsChildren extends ChildrenFlag,
>(
  self: Type<Props, Err, Requirements, Model, {}, Slots, AcceptsChildren>,
  actionDefinition: Spec,
): Type<
  Props,
  Err | ActionError<BoundActions<Spec, Model>>,
  Requirements | ActionRequirements<BoundActions<Spec, Model>>,
  Model,
  BoundActions<Spec, Model>,
  Slots,
  AcceptsChildren
>
export function actions<Model extends ModelShape, Actions extends ActionShape>(
  actionDefinition: ActionsInput<Model, Actions>,
): <Props, Err, Requirements, Slots extends SlotShape, AcceptsChildren extends ChildrenFlag>(
  self: Type<Props, Err, Requirements, Model, {}, Slots, AcceptsChildren>,
) => Type<
  Props,
  Err | ActionError<Actions>,
  Requirements | ActionRequirements<Actions>,
  Model,
  Actions,
  Slots,
  AcceptsChildren
>
export function actions<
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
  AcceptsChildren extends ChildrenFlag,
>(
  self: Type<Props, Err, Requirements, Model, {}, Slots, AcceptsChildren>,
  actionDefinition: ActionsInput<Model, Actions>,
): Type<
  Props,
  Err | ActionError<Actions>,
  Requirements | ActionRequirements<Actions>,
  Model,
  Actions,
  Slots,
  AcceptsChildren
>
export function actions<
  Model extends ModelShape,
  Actions extends ActionShape,
>(
  selfOrActions: Type<any, any, any, Model, {}, SlotShape, ChildrenFlag> | ActionsInput<Model, Actions>,
  actionDefinition?: ActionsInput<Model, Actions>,
) {
  if (actionDefinition === undefined) {
    return (self: Type<any, any, any, Model, {}, SlotShape, ChildrenFlag>) => patch(self, { actions: selfOrActions })
  }

  if (!isComponent(selfOrActions)) {
    return make(LoomCore.Ast.text(""))
  }

  return patch(selfOrActions, { actions: actionDefinition })
}

/** Attach a renderer-neutral view renderer to a component definition. */
export const view: {
  <
    Model extends ModelShape,
    Actions extends ActionShape,
    Slots extends SlotShape,
    Return extends Template.Renderable<any, any>,
  >(
    render: (context: ViewContext<any, Model, Actions, Slots>) => Return,
  ): <Props, Err, Requirements, AcceptsChildren extends ChildrenFlag>(
    self: Type<Props, Err, Requirements, Model, Actions, Slots, AcceptsChildren>,
  ) => Type<
    Props,
    Err | Template.ErrorOfRenderable<Return>,
    Requirements | Template.RequirementsOfRenderable<Return>,
    Model,
    Actions,
    Slots,
    AcceptsChildren
  >
  <
    Props,
    Err,
    Requirements,
    Model extends ModelShape,
    Actions extends ActionShape,
    Slots extends SlotShape,
    AcceptsChildren extends ChildrenFlag,
    Return extends Template.Renderable<any, any>,
  >(
    self: Type<Props, Err, Requirements, Model, Actions, Slots, AcceptsChildren>,
    render: (context: ViewContext<Props, Model, Actions, Slots>) => Return,
  ): Type<
    Props,
    Err | Template.ErrorOfRenderable<Return>,
    Requirements | Template.RequirementsOfRenderable<Return>,
    Model,
    Actions,
    Slots,
    AcceptsChildren
  >
} = ((
  selfOrRender:
    | Type
    | ((context: ViewContext<any, ModelShape, ActionShape, SlotShape>) => Template.Renderable<any, any>),
  render?: (context: ViewContext<any, ModelShape, ActionShape, SlotShape>) => Template.Renderable<any, any>,
) => {
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
}) as never

/** Attach slot contracts to a component definition. */
export function slots<Slots extends SlotShape>(
  slotDefinition: Slots,
): <
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  AcceptsChildren extends ChildrenFlag,
>(
  self: Type<
    Props,
    Err,
    Requirements,
    Model,
    Actions,
    {},
    AcceptsChildren
  >,
) => Type<Props, Err, Requirements, Model, Actions, Slots, false>
export function slots<
  Props,
  Err,
  Requirements,
  Model extends ModelShape,
  Actions extends ActionShape,
  Slots extends SlotShape,
  AcceptsChildren extends ChildrenFlag,
>(
  self: Type<Props, Err, Requirements, Model, Actions, {}, AcceptsChildren>,
  slotDefinition: Slots,
): Type<Props, Err, Requirements, Model, Actions, Slots, false>
export function slots<
  Slots extends SlotShape,
>(
  selfOrSlots: Type | Slots,
  slotDefinition?: Slots,
) {
  if (slotDefinition === undefined) {
    return (self: Type) => patch(self, { slots: selfOrSlots })
  }

  if (!isComponent(selfOrSlots)) {
    return make(LoomCore.Ast.text(""))
  }

  return patch(selfOrSlots, { slots: slotDefinition })
}

/** Attach default unnamed child composition to a component definition. */
export function children(): <Props, Err, Requirements, Model extends ModelShape, Actions extends ActionShape>(
  self: Type<
    Props,
    Err,
    Requirements,
    Model,
    Actions,
    {},
    false
  >,
) => Type<Props, Err, Requirements, Model, Actions, {}, true>
export function children(self: Type): Type
export function children(self?: Type) {
  if (self === undefined) {
    return (component: Type) => patch(component, { children: true })
  }

  return patch(self, { children: true })
}

const isPropsLikeObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !("_tag" in value)

const isSlotInputLike = (component: RuntimeType, value: unknown): value is RuntimeSlotInput => {
  if (!isPropsLikeObject(value)) {
    return false
  }

  const slotKeys = Object.keys(component.slots ?? {})
  const valueKeys = Object.keys(value)

  return valueKeys.length > 0 && valueKeys.every((key) => slotKeys.includes(key)) &&
    valueKeys.every((key) => viewChild.isViewChild(value[key]))
}

const resolveUseComposition = (
  component: RuntimeType,
  propsOrComposition: unknown,
  composition: unknown,
): {
  readonly props: unknown
  readonly composition: InstanceCompositionInput | undefined
} => {
  if (component.slots !== undefined) {
    if (composition !== undefined) {
      return {
        props: propsOrComposition,
        composition: { slots: composition as RuntimeSlotInput },
      }
    }

    if (isSlotInputLike(component, propsOrComposition)) {
      return {
        props: undefined,
        composition: { slots: propsOrComposition },
      }
    }

    return {
      props: propsOrComposition,
      composition: undefined,
    }
  }

  if (composition !== undefined) {
    return {
      props: propsOrComposition,
      composition: { children: composition as View.ViewChild },
    }
  }

  if (viewChild.isViewChild(propsOrComposition) && !isPropsLikeObject(propsOrComposition)) {
    return {
      props: undefined,
      composition: { children: propsOrComposition },
    }
  }

  return {
    props: propsOrComposition,
    composition: undefined,
  }
}

/**
 * Attach a capability to a component or render a component use with props/slots.
 * Supports both legacy capability usage and vNext layout composition.
 */
export const use: {
  (capability: Capability): (self: Type) => Type
  (self: Type, capability: Capability): Type
  <Props, Err, Requirements, Model extends ModelShape, Actions extends ActionShape>(
    component: Type<Props, Err, Requirements, Model, Actions, {}, true>,
  ): Template.Renderable<Err, Requirements>
  <Props, Err, Requirements, Model extends ModelShape, Actions extends ActionShape>(
    component: Type<Props, Err, Requirements, Model, Actions, {}, true>,
    children: View.ViewChild,
  ): Template.Renderable<Err, Requirements>
  <Props, Err, Requirements, Model extends ModelShape, Actions extends ActionShape>(
    component: Type<Props, Err, Requirements, Model, Actions, {}, true>,
    props: Props,
    children: View.ViewChild,
  ): Template.Renderable<Err, Requirements>
  <Props, Err, Requirements, Model extends ModelShape, Actions extends ActionShape, Slots extends SlotShape>(
    component: Type<Props, Err, Requirements, Model, Actions, Slots, false>,
    slots: SlotInput<Slots>,
  ): Template.Renderable<Err, Requirements>
  <Props, Err, Requirements, Model extends ModelShape, Actions extends ActionShape, Slots extends SlotShape>(
    component: Type<Props, Err, Requirements, Model, Actions, Slots, false>,
    props: Props,
    slots: SlotInput<Slots>,
  ): Template.Renderable<Err, Requirements>
} = ((
  selfOrCapability: Type | Capability,
  capabilityOrProps?: Capability | unknown,
  slotInput?: unknown,
) => {
  if (capabilityOrProps === undefined) {
    if (selfOrCapability._tag === "Component") {
      const resolved = resolveUseComposition(selfOrCapability, undefined, slotInput)
      return renderComponentUse(selfOrCapability, resolved.props, resolved.composition)
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

    const resolved = resolveUseComposition(selfOrCapability, capabilityOrProps, slotInput)
    return renderComponentUse(selfOrCapability, resolved.props, resolved.composition)
  }

  return make(LoomCore.Ast.text(""))
}) as never
