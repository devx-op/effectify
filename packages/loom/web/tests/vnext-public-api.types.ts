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

const stateCounter = Component.make("state-counter").pipe(
  Component.state({ count, label: "ready" }),
  Component.stateFactory(() => ({ local: Atom.make(0) })),
  Component.actions({
    incrementShared: ({ count }) => count.update((value) => value + 1),
    incrementLocal: ({ local }) => local.update((value) => value + 1),
    read: ({ count, label, local, state }) => {
      const sharedCount: number = count.get()
      const currentLabel: string = label
      const localCount: number = local.get()
      const liveShared: number = state.count()
      const liveLocal: number = state.local()

      return `${currentLabel}:${sharedCount + localCount + liveShared + liveLocal}`
    },
  }),
  Component.view(({ state }) =>
    View.stack(
      View.text(() => `Count: ${state.count()}`),
      View.text(() => `Local: ${state.local()}`),
      View.text(() => `Label: ${state.label()}`),
    )
  ),
)

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
const textView = View.text("hello")
const semanticTextView = View.text("paragraph copy").pipe(Web.as("p"))
const aliasView = View.stack(View.text("hello"))
let isPositive = true
let hasMany = false
const conditionalView = View.if(true, View.text("ready"), View.text("waiting"))
const trackedConditionalView = View.if(() => isPositive, View.text("positive"), View.text("empty"))
const legacyConditionalView = View.when(() => hasMany, View.text("many"), View.text("few"))
const keyedListView = View.for(
  [
    { id: "alpha", label: "Alpha" },
    { id: "beta", label: "Beta" },
  ],
  {
    key: (item) => {
      const id: string = item.id
      return id
    },
    render: (item, index) => {
      const label: string = item.label
      const position: number = index

      return View.text(`${position}:${label}`)
    },
    empty: View.text("empty"),
  },
)
const reactiveView = View.stack(View.text("hello")).pipe(
  Web.as("section"),
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
const mountedStateCounter = mount({ stateCounter }, { registry: AtomRegistry.make() })
const mountedEffectful = mount({ effectfulCounter })
const instantiatedStateCounter = Component.instantiate(stateCounter)
const instantiatedCounter = Component.instantiate(counter)
const instantiatedEffectful = Component.instantiate(effectfulCounter)
const maybeClassName = view._tag === "Element" ? view.attributes.class : undefined
const maybeDataVariant = view._tag === "Element" ? view.attributes["data-variant"] : undefined
const maybeAriaLabel = view._tag === "Element" ? view.attributes["aria-label"] : undefined
const maybeStyle = view._tag === "Element" ? view.attributes.style : undefined
const textTag = textView._tag === "Element" ? textView.tagName : undefined
const semanticTextTag = semanticTextView._tag === "Element" ? semanticTextView.tagName : undefined
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
const textTagValue: string | undefined = textTag
const semanticTextTagValue: string | undefined = semanticTextTag
const mountEntry: string = mounted.entry
const mountedCount: number = mounted.state.count()
const mountedLabel: string = mounted.state.label()
const mountedStateShared: number = mountedStateCounter.state.count()
const mountedStateLocal: number = mountedStateCounter.state.local()
const mountedReadResult: string = instantiatedCounter.actions.read()
const mountedStateReadResult: string = instantiatedStateCounter.actions.read()
const mountedObservabilityEntry: string = mounted.observability.mount.entry
const mountedActionObservationCount: number = mounted.observability.actions.increment.invocations
const stateCounterHasSharedState: boolean = stateCounter.state !== undefined
const stateCounterHasFactory: boolean = typeof stateCounter.stateFactory === "function"
const effectfulError: SaveFailure | undefined = effectfulCounter.__error
const effectfulRequirements: SaveGateway | undefined = effectfulCounter.__requirements
const mountedLoad = instantiatedEffectful.actions.load()
const loadExecution: Component.ActionEffect<string, SaveFailure, SaveGateway> = mountedLoad
const loadExecutionLabel: string | undefined = loadExecution.annotations?.label
const stackAlias: View.Node = aliasView
const conditionalNode: View.Node = conditionalView
const trackedConditionalNode: View.Node = trackedConditionalView
const legacyConditionalNode: View.Node = legacyConditionalView
const keyedListNode: View.Node = keyedListView
const reactiveNode: View.Node = reactiveView
const buttonView: View.Node = actionView
const plainLinkNode: View.Node = stringLinkView
const objectLinkNode: View.Node = objectLinkView

mounted.model.count.set(0)
mounted.model.local.update((value) => value + 1)
mountedStateCounter.model.count.set(0)
mountedStateCounter.model.local.update((value) => value + 1)

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

// @ts-expect-error Read-friendly state exposes plain local values, not writable handles.
mountedStateCounter.state.local.set(0)

// @ts-expect-error Mounted state accessors must be invoked to read their values.
const _invalidMountedCount: number = mounted.state.count

// @ts-expect-error Component.state rejects factory entries; use Component.stateFactory instead.
Component.state({ invalid: () => Atom.make(0) })

// @ts-expect-error Component.state rejects thunk values even when they do not return Atoms.
Component.state({ invalid: () => 1 })

// @ts-expect-error Non-Atom model values are not writable handles.
mounted.model.label.update((value) => value)

// @ts-expect-error Fine-grained reactive attrs record thunks stay out of scope for this slice.
Web.attrs(() => ({ id: "dynamic-id" }))

// @ts-expect-error Fine-grained reactive hydration is out of scope for this slice.
Web.hydrate(() => Hydration.manual())

// @ts-expect-error Link options require an href contract.
View.link("Docs", { target: "_blank" })

// @ts-expect-error View.if requires boolean snapshot inputs.
View.if(1, View.text("invalid"))

// @ts-expect-error View.if thunk inputs must resolve to booleans.
View.if(() => "truthy", View.text("invalid"))

// @ts-expect-error View.for requires an explicit key extractor.
View.for([{ id: "alpha", label: "Alpha" }], {
  render: (item) => View.text(item.label),
})

// @ts-expect-error View.for keys must be PropertyKey values.
View.for([{ id: "alpha", label: "Alpha" }], {
  key: (item) => ({ id: item.id }),
  render: (item) => View.text(item.label),
})

if (Component.isActionEffect(mountedLoad)) {
  const observedLabel: string | undefined = mountedLoad.annotations?.label
  void observedLabel
}

export const typecheckSmoke = {
  counter,
  stateCounter,
  effectfulCounter,
  counterName,
  counterModel,
  stateCounterHasSharedState,
  stateCounterHasFactory,
  layoutSlots,
  classNameValue,
  dataVariantValue,
  ariaLabelValue,
  styleValue,
  textTagValue,
  semanticTextTagValue,
  mountEntry,
  mountedObservabilityEntry,
  mountedActionObservationCount,
  mountedCount,
  mountedLabel,
  mountedStateShared,
  mountedStateLocal,
  mountedReadResult,
  mountedStateReadResult,
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
  conditionalNode,
  trackedConditionalNode,
  legacyConditionalNode,
  keyedListNode,
  reactiveNode,
  reactiveBindings,
  buttonView,
  plainLinkNode,
  objectLinkNode,
  mounted,
  mountedStateCounter,
  mountedEffectful,
}
