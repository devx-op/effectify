import * as Effect from "effect/Effect"
import { Atom, AtomRegistry } from "effect/unstable/reactivity"
import { Component, mount, Slot, View, Web } from "../src/index.js"

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
      View.text(`Count: ${state.count}`),
      View.text(`Label: ${state.label}`),
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

const slottedPage = Component.make("slotted-page").pipe(
  Component.view(() =>
    Component.use(layout, undefined, {
      default: View.text("content"),
      header: View.text("header"),
    })
  ),
)

const view = View.stack(View.text("hello")).pipe(
  Web.className("stack"),
  Web.attrs({ id: "stack" }),
  Web.data("variant", "primary"),
  Web.aria("label", "Greeting"),
  Web.style({ display: "flex", gap: "1rem" }),
)
const mounted = mount({ counter }, { registry: AtomRegistry.make() })
const mountedEffectful = mount({ effectfulCounter })
const instantiatedCounter = Component.instantiate(counter)
const instantiatedEffectful = Component.instantiate(effectfulCounter)
const maybeClassName = view._tag === "Element" ? view.attributes.class : undefined
const maybeDataVariant = view._tag === "Element" ? view.attributes["data-variant"] : undefined
const maybeAriaLabel = view._tag === "Element" ? view.attributes["aria-label"] : undefined
const maybeStyle = view._tag === "Element" ? view.attributes.style : undefined
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
const classNameValue: string | undefined = maybeClassName
const dataVariantValue: string | undefined = maybeDataVariant
const ariaLabelValue: string | undefined = maybeAriaLabel
const styleValue: string | undefined = maybeStyle
const mountEntry: string = mounted.entry
const mountedCount: number = mounted.state.count
const mountedLabel: string = mounted.state.label
const mountedReadResult: string = instantiatedCounter.actions.read()
const mountedObservabilityEntry: string = mounted.observability.mount.entry
const mountedActionObservationCount: number = mounted.observability.actions.increment.invocations
const effectfulError: SaveFailure | undefined = effectfulCounter.__error
const effectfulRequirements: SaveGateway | undefined = effectfulCounter.__requirements
const mountedLoad = instantiatedEffectful.actions.load()
const loadExecution: Component.ActionEffect<string, SaveFailure, SaveGateway> = mountedLoad
const loadExecutionLabel: string | undefined = loadExecution.annotations?.label

mounted.model.count.set(0)
mounted.model.local.update((value) => value + 1)

// @ts-expect-error Slot.required does not accept arguments.
Slot.required("default")

// @ts-expect-error Required slots must be provided when using a slotted component.
Component.use(layout, undefined, {
  header: View.text("header"),
})

// @ts-expect-error mount requires named component records.
mount(counter)

// @ts-expect-error Read-friendly state exposes plain values, not writable handles.
mounted.state.count.set(0)

// @ts-expect-error Non-Atom model values are not writable handles.
mounted.model.label.update((value) => value)

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
  slottedPage,
  view,
  mounted,
  mountedEffectful,
}
