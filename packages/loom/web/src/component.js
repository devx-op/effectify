import { Atom, AtomRegistry } from "effect/unstable/reactivity"
import * as LoomCore from "@effectify/loom-core"
import * as pipeable from "./internal/pipeable.js"
import { trackStateAtomRead } from "./internal/tracked-state.js"
import * as viewChild from "./internal/view-child.js"
const makePipeable = (value) => pipeable.make(value)
const emptyNode = LoomCore.Ast.fragment([])
const emptyActions = {}
const isNode = (value) => typeof value === "object" && value !== null && "_tag" in value
const isComponent = (value) =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "Component"
const isCapability = (value) =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "ComponentEffect"
export const isActionEffect = (value) =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "LoomActionEffect"
const isModelFactory = (value) => typeof value === "function" && !Atom.isAtom(value)
const materializeModel = (model) => {
  const entries = Object.entries(model ?? {}).map(([key, value]) => [
    key,
    isModelFactory(value) ? value() : value,
  ])
  return Object.fromEntries(entries)
}
const createState = (model, registry) => {
  const keys = Object.keys(model)
  return new Proxy({}, {
    get(_target, property) {
      if (typeof property !== "string") {
        return undefined
      }
      const value = model[property]
      return Atom.isAtom(value)
        ? () => {
          trackStateAtomRead(value)
          return registry.get(value)
        }
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
  })
}
const createWriteModel = (model, registry) => {
  const entries = Object.entries(model).map(([key, value]) => [
    key,
    typeof value === "object" && value !== null && Atom.isWritable(value)
      ? {
        atom: value,
        get: () => registry.get(value),
        set: (next) => registry.set(value, next),
        update: (update) => registry.update(value, update),
      }
      : value,
  ])
  return Object.fromEntries(entries)
}
const resolveSlots = (slots, values) => {
  const entries = Object.entries(slots ?? {}).map(([key, definition]) => {
    const slotValue = values?.[key]
    if (definition.required && values !== undefined && slotValue === undefined) {
      throw new Error(`missing required slot '${key}'`)
    }
    return [key, slotValue]
  })
  return Object.fromEntries(entries)
}
const isActionSpec = (value) => {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const entries = Object.values(value)
  return entries.length > 0 && entries.every((entry) => typeof entry === "function") &&
    entries.some((entry) => entry.length > 0)
}
const bindActionSpec = (actionSpec, context) => {
  const entries = Object.entries(actionSpec).map(([key, action]) => [
    key,
    () => action(context),
  ])
  return Object.fromEntries(entries)
}
export const instantiate = (
  component,
  registry = component.registry ?? AtomRegistry.make(),
  props,
  compositionInput,
) => {
  const materializedModel = materializeModel(component.model)
  const model = createWriteModel(materializedModel, registry)
  const state = createState(materializedModel, registry)
  const actionContext = {
    model,
    state,
    registry,
    component: {
      name: component.name,
    },
  }
  const actionBindingContext = Object.assign({}, model, actionContext)
  const actionDefinition = component.actions
  const actions = typeof actionDefinition === "function"
    ? actionDefinition(actionContext)
    : isActionSpec(actionDefinition)
    ? bindActionSpec(actionDefinition, actionBindingContext)
    : (actionDefinition ?? emptyActions)
  const children = component.children === true ? compositionInput?.children : undefined
  const slots = resolveSlots(component.slots, compositionInput?.slots)
  return {
    registry,
    model,
    state,
    actions,
    children,
    slots,
    render: (boundActions = actions) =>
      component.render === undefined
        ? component.node
        : component.render({
          ...actionContext,
          props,
          actions: boundActions,
          children,
          slots,
        }),
  }
}
const materialize = (component) => {
  const instance = instantiate(component, component.registry ?? AtomRegistry.make())
  return instance.render()
}
const renderComponentUse = (component, props, compositionInput) =>
  instantiate(component, component.registry ?? AtomRegistry.make(), props, compositionInput).render()
const reconcile = (component) =>
  makePipeable({
    ...component,
    registry: component.registry ?? AtomRegistry.make(),
    node: materialize(component),
  })
const patch = (component, update) =>
  reconcile(makePipeable({
    ...component,
    ...update,
  }))
export function make(input) {
  const definition = LoomCore.Component.make(isNode(input) ? input : emptyNode)
  return reconcile(makePipeable({
    ...definition,
    name: typeof input === "string" ? input : undefined,
    registry: AtomRegistry.make(),
  }))
}
/** Backwards-compatible alias kept while the public API settles. */
export const fromNode = make
/** Create an Effect-backed component capability. */
export const effect = (componentEffect) => LoomCore.Component.effect(componentEffect)
/** Explicitly represent Effect-like action work while preserving Err and Requirements inference. */
export const actionEffect = (effect, annotations) => ({
  _tag: "LoomActionEffect",
  effect,
  annotations,
})
export function model(selfOrModel, modelDefinition) {
  if (modelDefinition === undefined) {
    return (self) => patch(self, { model: selfOrModel })
  }
  if (!isComponent(selfOrModel)) {
    return make(LoomCore.Ast.text(""))
  }
  return patch(selfOrModel, { model: modelDefinition })
}
export function actions(selfOrActions, actionDefinition) {
  if (actionDefinition === undefined) {
    return (self) => patch(self, { actions: selfOrActions })
  }
  if (!isComponent(selfOrActions)) {
    return make(LoomCore.Ast.text(""))
  }
  return patch(selfOrActions, { actions: actionDefinition })
}
export function view(selfOrRender, render) {
  if (render === undefined) {
    if (isComponent(selfOrRender)) {
      return selfOrRender
    }
    return (self) => patch(self, { render: selfOrRender })
  }
  if (!isComponent(selfOrRender)) {
    return make(LoomCore.Ast.text(""))
  }
  return patch(selfOrRender, { render })
}
export function slots(selfOrSlots, slotDefinition) {
  if (slotDefinition === undefined) {
    return (self) => patch(self, { slots: selfOrSlots })
  }
  if (!isComponent(selfOrSlots)) {
    return make(LoomCore.Ast.text(""))
  }
  return patch(selfOrSlots, { slots: slotDefinition })
}
export function children(self) {
  if (self === undefined) {
    return (component) => patch(component, { children: true })
  }
  return patch(self, { children: true })
}
const isPropsLikeObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !("_tag" in value)
const resolveUseComposition = (component, propsOrComposition, composition) => {
  if (component.children === true) {
    if (composition !== undefined) {
      return {
        props: propsOrComposition,
        composition: { children: composition },
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
  if (component.slots !== undefined) {
    return {
      props: propsOrComposition,
      composition: composition === undefined ? undefined : { slots: composition },
    }
  }
  return {
    props: propsOrComposition,
    composition: undefined,
  }
}
export function use(selfOrCapability, capabilityOrProps, slotInput) {
  if (capabilityOrProps === undefined) {
    if (selfOrCapability._tag === "Component" && slotInput !== undefined) {
      const resolved = resolveUseComposition(selfOrCapability, undefined, slotInput)
      return renderComponentUse(selfOrCapability, resolved.props, resolved.composition)
    }

    if (selfOrCapability._tag === "ComponentEffect") {
      return (self) =>
        reconcile(makePipeable({
          ...self,
          ...LoomCore.Component.use(self, selfOrCapability),
        }))
    }
    return (self) => self
  }
  if (selfOrCapability._tag === "Component") {
    if (isCapability(capabilityOrProps)) {
      return reconcile(makePipeable({
        ...selfOrCapability,
        ...LoomCore.Component.use(selfOrCapability, capabilityOrProps),
      }))
    }
    const resolved = resolveUseComposition(selfOrCapability, capabilityOrProps, slotInput)
    return renderComponentUse(selfOrCapability, resolved.props, resolved.composition)
  }
  return make(LoomCore.Ast.text(""))
}
