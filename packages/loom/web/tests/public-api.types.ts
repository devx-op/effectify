import { Component, Html, Hydration } from "../src/index.js"

const effectLike = { _tag: "EffectLike" } as const

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
  ? true
  : false
type Expect<Value extends true> = Value

const component = Component.make(Html.text("typed"))
const capability = Component.effect(effectLike)
const visibleStrategy = Hydration.strategy.visible()

const usedDataFirst = Component.use(component, capability)
const usedDataLast = Component.use(capability)(component)

const contextual = Html.on("submit", ({ event, runtime, target }) => {
  event.preventDefault()
  const root = runtime.root
  return root === runtime.root && target === target ? effectLike : effectLike
})

const simple = Html.on("click", effectLike)

Html.el("form", Html.hydrate(visibleStrategy), contextual, Html.children(usedDataFirst, usedDataLast))
Html.el("button", simple, Html.children("send"))

const ssr = Html.ssr(Html.el("main", Html.children("ready")))
const html = Html.renderToString(Html.el("main", Html.children("ready")))
const bootstrap = Hydration.bootstrap(document.body)
const activation = Hydration.activate(document.body, ssr)
const activationFromSource = Hydration.activate(document.body, ssr.activation, {
  onEffect: (effect, { event, runtime, target }) => {
    return effect === effectLike && event.type.length >= 0 && runtime.root === runtime.root && target === target
      ? undefined
      : undefined
  },
})
const mismatches: ReadonlyArray<Hydration.Mismatch> = bootstrap.mismatches
const activationIssues = activation.issues

type StrategyContract = Expect<Equal<typeof visibleStrategy, Hydration.Strategy>>

// @ts-expect-error Html.hydrate requires an explicit Hydration.strategy helper value.
Html.hydrate("visible")

// @ts-expect-error Hydration.boundary requires a strategy helper value, not a raw string.
Hydration.boundary("idle")

export const typecheckSmoke = {
  usedDataFirst,
  usedDataLast,
  contextual,
  simple,
  ssr,
  html,
  visibleStrategy,
  mismatches,
  bootstrap,
  activation,
  activationFromSource,
  activationIssues,
}

export type { StrategyContract }
