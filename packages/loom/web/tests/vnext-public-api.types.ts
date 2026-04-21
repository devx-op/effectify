import * as Effect from "effect/Effect"
import { Atom, AtomRegistry } from "effect/unstable/reactivity"
import { Component, Hydration, mount, Slot, View, Web } from "../src/index.js"

const effectLike = { _tag: "EffectLike" } as const

class SaveFailure extends Error {
  readonly _tag = "SaveFailure"
}

interface SaveGateway {
  readonly save: (count: number) => Effect.Effect<string, SaveFailure>
}

const loadRemote = (_count: number): Effect.Effect<string, SaveFailure, SaveGateway> =>
  Effect.fail(new SaveFailure("boom"))

const count = Atom.make(1)

const counter = Component.make("counter").pipe(
  Component.model({ count, label: "ready", local: () => Atom.make(0) }),
  Component.actions({
    increment: ({ count }) => {
      count.update((value) => value + 1)
      return effectLike
    },
    reset: ({ count }) => count.set(0),
    read: ({ count, label, local }) => {
      const current: number = count.get()
      const nextLabel: string = label
      const localValue: number = local.get()

      return `${nextLabel}:${current + localValue}`
    },
  }),
  Component.view(({ state, actions }) =>
    View.stack(
      View.text(() => `Count: ${state.count()}`),
      View.text(() => `Label: ${state.label()}`),
      View.button("Increment", actions.increment),
    ).pipe(Web.className("counter"))
  ),
)

const effectfulCounter = Component.make("effectful-counter").pipe(
  Component.model({ count }),
  Component.actions({
    load: ({ count }) =>
      Component.actionEffect(
        loadRemote(count.get()),
        {
          label: "load-count",
          details: {
            source: "remote",
          },
        },
      ),
    fail: () => Effect.fail(new SaveFailure("boom")),
  }),
)

const layout = Component.make("layout").pipe(
  Component.slots({
    default: Slot.required(),
    header: Slot.optional(),
  }),
  Component.view(({ slots }) => View.text(Object.keys(slots).join(","))),
)

const card = Component.make("card").pipe(
  Component.children(),
  Component.view(({ children }) =>
    View.vstack(
      View.text("Card"),
      View.main(children),
    )
  ),
)

const badge = Component.make("badge").pipe(
  Component.view(() => View.text("Docs")),
)

const slottedPage = Component.make("slotted-page").pipe(
  Component.view(() =>
    Component.use(layout, undefined, {
      default: View.text("content"),
      header: View.text("header"),
    })
  ),
)

const childrenPage = Component.make("children-page").pipe(
  Component.view(() =>
    View.fragment(
      Component.use(card, View.text("content")),
      Component.use(card, undefined, ["nested ", 2, View.text("content")]),
    )
  ),
)

const view = View.vstack(View.text("hello")).pipe(
  Web.className("stack"),
  Web.attrs({ id: "stack" }),
  Web.data("variant", "primary"),
  Web.aria("label", "Greeting"),
  Web.style({ display: "flex", gap: "1rem" }),
)
const aliasView = View.stack(View.text("hello"))
const reactiveView = View.stack(View.text("hello")).pipe(
  Web.attr("data-count", () => "1"),
  Web.attrs({
    id: () => "dynamic-id",
    title: () => "Dynamic title",
  }),
  Web.data("variant", () => "interactive"),
  Web.aria("label", () => "Greeting"),
  Web.className(() => "stack interactive"),
  Web.style(() => ({ display: "flex", gap: "1rem" })),
)
const actionView = View.button(View.hstack(View.text("+"), "Save"), effectLike)
const stringLinkView = View.link("Open settings", "/settings")
const objectLinkView = View.link(View.fragment(badge, " docs"), {
  href: "/docs",
  target: "_blank",
  rel: "noreferrer",
})
const mounted = mount({ counter }, { registry: AtomRegistry.make() })
const mountedEffectful = mount({ effectfulCounter })
const instantiatedCounter = Component.instantiate(counter)
const instantiatedEffectful = Component.instantiate(effectfulCounter)
const maybeClassName = view._tag === "Element" ? view.attributes.class : undefined
const maybeDataVariant = view._tag === "Element" ? view.attributes["data-variant"] : undefined
const maybeAriaLabel = view._tag === "Element" ? view.attributes["aria-label"] : undefined
const maybeStyle = view._tag === "Element" ? view.attributes.style : undefined
const reactiveBindings = reactiveView._tag === "Element" ? reactiveView.bindings : []
const counterName: string | undefined = counter.name
const counterModel:
  | {
    readonly count: typeof count
    readonly label: string
    readonly local: () => typeof count
  }
  | undefined = counter.model
const layoutSlots:
  | {
    readonly default: Slot.Definition
    readonly header: Slot.Definition
  }
  | undefined = layout.slots
const cardChildren: true | undefined = card.children
const classNameValue: string | undefined = maybeClassName
const dataVariantValue: string | undefined = maybeDataVariant
const ariaLabelValue: string | undefined = maybeAriaLabel
const styleValue: string | undefined = maybeStyle
const mountEntry: string = mounted.entry
const mountedCount: number = mounted.state.count()
const mountedLabel: string = mounted.state.label()
const mountedReadResult: string = instantiatedCounter.actions.read()
const mountedObservabilityEntry: string = mounted.observability.mount.entry
const mountedActionObservationCount: number = mounted.observability.actions.increment.invocations
const effectfulError: SaveFailure | undefined = effectfulCounter.__error
const effectfulRequirements: SaveGateway | undefined = effectfulCounter.__requirements
const mountedLoad = instantiatedEffectful.actions.load()
const loadExecution: Component.ActionEffect<string, SaveFailure, SaveGateway> = mountedLoad
const loadExecutionLabel: string | undefined = loadExecution.annotations?.label
const stackAlias: View.Node = aliasView
const reactiveNode: View.Node = reactiveView
const buttonView: View.Node = actionView
const plainLinkNode: View.Node = stringLinkView
const objectLinkNode: View.Node = objectLinkView

mounted.model.count.set(0)
mounted.model.local.update((value) => value + 1)

// @ts-expect-error Slot.required does not accept arguments.
Slot.required("default")

// @ts-expect-error Required slots must be provided when using a slotted component.
Component.use(layout, undefined, {
  header: View.text("header"),
})

// @ts-expect-error Children components accept unnamed content, not slot objects.
Component.use(card, {
  default: View.text("content"),
})

// @ts-expect-error Slot-based components do not accept plain children content.
Component.use(layout, View.text("content"))

// @ts-expect-error mount requires named component records.
mount(counter)

// @ts-expect-error Read-friendly state exposes plain values, not writable handles.
mounted.state.count.set(0)

// @ts-expect-error Mounted state accessors must be invoked to read their values.
const _invalidMountedCount: number = mounted.state.count

// @ts-expect-error Non-Atom model values are not writable handles.
mounted.model.label.update((value) => value)

// @ts-expect-error Fine-grained reactive attrs record thunks stay out of scope for this slice.
Web.attrs(() => ({ id: "dynamic-id" }))

// @ts-expect-error Fine-grained reactive hydration is out of scope for this slice.
Web.hydrate(() => Hydration.manual())

// @ts-expect-error Link options require an href contract.
View.link("Docs", { target: "_blank" })

if (Component.isActionEffect(mountedLoad)) {
  const observedLabel: string | undefined = mountedLoad.annotations?.label
  void observedLabel
}

export const typecheckSmoke = {
  counter,
  effectfulCounter,
  counterName,
  counterModel,
  layoutSlots,
  classNameValue,
  dataVariantValue,
  ariaLabelValue,
  styleValue,
  mountEntry,
  mountedObservabilityEntry,
  mountedActionObservationCount,
  mountedCount,
  mountedLabel,
  mountedReadResult,
  loadExecution,
  loadExecutionLabel,
  effectfulError,
  effectfulRequirements,
  layout,
  card,
  cardChildren,
  slottedPage,
  childrenPage,
  view,
  stackAlias,
  reactiveNode,
  reactiveBindings,
  buttonView,
  plainLinkNode,
  objectLinkNode,
  mounted,
  mountedEffectful,
}
