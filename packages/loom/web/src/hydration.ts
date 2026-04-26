import * as LoomCore from "@effectify/loom-core"
import * as LoomRuntime from "@effectify/loom-runtime"
import type * as Diagnostics from "./diagnostics.js"

/**
 * Advanced hydration surface.
 *
 * Keep hydration explicit and public, but document it as layered after the
 * primary interactive authoring path (`Component`, `View`, `Web`, `Slot`, and
 * `mount`).
 */

/** Supported public hydration strategy names for the Loom skeleton. */
export type StrategyName = LoomRuntime.Hydration.StrategyName

/** Supported public hydration strategies for the Loom skeleton. */
export type Strategy = LoomRuntime.Hydration.Marker

/** Public view of a normalized hydratable boundary. */
export type Boundary = LoomRuntime.Runtime.HydrationBoundaryHandle

/** Public view of a hydration mismatch discovered during bootstrap. */
export type Mismatch = LoomRuntime.Runtime.HydrationMismatch

/** Public bootstrap result for hydratable DOM discovery. */
export interface BootstrapResult extends LoomRuntime.Runtime.HydrationBootstrapResult {
  readonly diagnosticSummary: ReadonlyArray<Diagnostics.Summary>
}

/** Public view of a hydrated event binding attached during activation. */
export type ActivatedEventBinding = LoomRuntime.Runtime.ActivatedEventBinding

/** Minimal serialized event binding contract used by hydration activation. */
export type ActivationEventBinding = LoomRuntime.Runtime.ActivationEventBinding

/** Minimal serialized boundary contract used by hydration activation. */
export type ActivationBoundary = LoomRuntime.Runtime.ActivationBoundary

/** Minimal manifest contract carried from SSR to hydration activation. */
export type ActivationManifest = LoomRuntime.Runtime.ActivationManifest

/** Public view of an activated boundary after listener rebinding. */
export type ActivatedBoundary = LoomRuntime.Runtime.ActivatedBoundary

/** Public view of activation issues discovered during hydration startup. */
export type ActivationIssue = LoomRuntime.Runtime.HydrationActivationIssue

/** Public view of activated live regions discovered during hydration startup. */
export type ActivatedLiveRegion = LoomRuntime.Runtime.ActivatedLiveRegion

/** Public activation result for the current first real hydration scope. */
export interface ActivationResult extends LoomRuntime.Runtime.HydrationActivationResult {
  readonly diagnosticSummary: ReadonlyArray<Diagnostics.Summary>
}

/** Explicit dispatcher hook for simple Effect-form event handlers during hydration activation. */
export type ActivationOptions = LoomRuntime.Runtime.HydrationActivationOptions

/** Minimal activation source contract accepted from SSR output. */
export type ActivationSource = LoomRuntime.Runtime.ActivationSource

/** Activation source created from a validated resumability contract plus local executable registry. */
export type ResumabilityActivationSource = LoomRuntime.Runtime.ResumabilityActivationSource

/** Input accepted by hydration activation while the public SSR contract still carries extra planning data. */
export type ActivationInput = ActivationSource | ResumabilityActivationSource | LoomRuntime.Runtime.SsrRenderResult

const makeStrategy = (name: StrategyName): Strategy => LoomRuntime.Hydration.marker(name)

/** First-class hydration strategy helpers kept close to the public API. */
export const strategy = {
  visible: (): Strategy => makeStrategy("visible"),
  idle: (): Strategy => makeStrategy("idle"),
  interaction: (): Strategy => makeStrategy("interaction"),
  manual: (): Strategy => makeStrategy("manual"),
} as const

/** Create a visible hydration strategy marker. */
export const visible = (): Strategy => strategy.visible()

/** Create an idle hydration strategy marker. */
export const idle = (): Strategy => strategy.idle()

/** Create an interaction hydration strategy marker. */
export const interaction = (): Strategy => strategy.interaction()

/** Create a manual hydration strategy marker. */
export const manual = (): Strategy => strategy.manual()

/** Convert a strategy marker into neutral AST hydration metadata. */
export const boundary = (selectedStrategy: Strategy): LoomCore.Ast.HydrationMetadata =>
  LoomCore.Ast.hydrationMetadata(selectedStrategy.strategy, {
    [selectedStrategy.attributeName]: selectedStrategy.attributeValue,
  })

/** Hydration strategy attribute name used in server/client handshakes. */
export const attributeName = LoomRuntime.Hydration.attributeName

/** Stable boundary id attribute emitted during SSR. */
export const boundaryIdAttributeName = LoomRuntime.Hydration.boundaryIdAttributeName

/** Stable event registry attribute emitted during SSR. */
export const eventNamesAttributeName = LoomRuntime.Hydration.eventNamesAttributeName

/** Stable interactive node id attribute emitted during SSR. */
export const nodeIdAttributeName = LoomRuntime.Hydration.nodeIdAttributeName

/** Stable per-node event metadata emitted during SSR. */
export const nodeEventNamesAttributeName = LoomRuntime.Hydration.nodeEventNamesAttributeName

/** Discover hydratable boundaries from SSR markup. */
export const discover = (root: ParentNode): ReadonlyArray<Boundary> =>
  LoomRuntime.Runtime.discoverHydrationBoundaries(root)

/** Normalize the current DOM root into a bootstrap plan. */
export const bootstrap = (root: ParentNode): BootstrapResult => {
  const result = LoomRuntime.Runtime.bootstrapHydration(root)

  return {
    ...result,
    diagnosticSummary: result.diagnostics.map(LoomRuntime.Diagnostics.summarize),
  }
}

/** Activate discovered hydratable boundaries against the current SSR activation source. */
export const activate = (root: ParentNode, source: ActivationInput, options?: ActivationOptions): ActivationResult => {
  const result = LoomRuntime.Runtime.activateHydration(root, source, options)

  return {
    ...result,
    diagnosticSummary: result.diagnostics.map(LoomRuntime.Diagnostics.summarize),
  }
}
