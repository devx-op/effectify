import { Atom, AtomRegistry } from "effect/unstable/reactivity"
import { Component, Diagnostics, Html, Hydration, Resumability } from "../src/index.js"

const effectLike = { _tag: "EffectLike" } as const

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
  ? true
  : false
type Expect<Value extends true> = Value

const component = Component.make(Html.text("typed"))
const capability = Component.effect(effectLike)
const visibleStrategy = Hydration.strategy.visible()
const liveAtom = Atom.make("typed-live")

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
Html.live(liveAtom, (value) => {
  const text: string = value
  return Html.text(text)
})

const ssr = Html.ssr(Html.el("main", Html.children("ready")))
const ssrWithRegistry = Html.ssr(Html.live(liveAtom, (value) => Html.text(value)), {
  registry: AtomRegistry.make(),
})
const html = Html.renderToString(Html.el("main", Html.children("ready")))
const bootstrap = Hydration.bootstrap(document.body)
const activation = Hydration.activate(document.body, ssr)
const createRenderContract = Resumability.createRenderContract(ssr, {
  buildId: "build-123",
  rootId: "loom-root",
})
const activationFromSource = Hydration.activate(document.body, ssr.activation, {
  onEffect: (effect, { event, runtime, target }) => {
    return effect === effectLike && event.type.length >= 0 && runtime.root === runtime.root && target === target
      ? undefined
      : undefined
  },
})
const mismatches: ReadonlyArray<Hydration.Mismatch> = bootstrap.mismatches
const activationIssues = activation.issues
const activationRegistry = activation.registry
const disposeActivation = activation.dispose

type StrategyContract = Expect<Equal<typeof visibleStrategy, Hydration.Strategy>>
type SsrDiagnosticSummaryContract = Expect<Equal<typeof ssr.diagnosticSummary, ReadonlyArray<Diagnostics.Summary>>>
type BootstrapDiagnosticSummaryContract = Expect<
  Equal<typeof bootstrap.diagnosticSummary, ReadonlyArray<Diagnostics.Summary>>
>
type ActivationDiagnosticSummaryContract = Expect<
  Equal<typeof activation.diagnosticSummary, ReadonlyArray<Diagnostics.Summary>>
>
type CreateRenderContractDiagnosticSummaryContract = Expect<
  Equal<Awaited<typeof createRenderContract>["diagnosticSummary"], ReadonlyArray<Diagnostics.Summary>>
>

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
  ssrWithRegistry,
  createRenderContract,
  html,
  visibleStrategy,
  mismatches,
  bootstrap,
  activation,
  activationFromSource,
  activationIssues,
  activationRegistry,
  disposeActivation,
}

export type {
  ActivationDiagnosticSummaryContract,
  BootstrapDiagnosticSummaryContract,
  CreateRenderContractDiagnosticSummaryContract,
  SsrDiagnosticSummaryContract,
  StrategyContract,
}
