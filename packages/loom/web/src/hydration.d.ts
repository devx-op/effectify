import * as LoomCore from "@effectify/loom-core"
import * as LoomRuntime from "@effectify/loom-runtime"
import type * as Diagnostics from "./diagnostics.js"
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
/** First-class hydration strategy helpers kept close to the public API. */
export declare const strategy: {
  readonly visible: () => Strategy
  readonly idle: () => Strategy
  readonly interaction: () => Strategy
  readonly manual: () => Strategy
}
/** Create a visible hydration strategy marker. */
export declare const visible: () => Strategy
/** Create an idle hydration strategy marker. */
export declare const idle: () => Strategy
/** Create an interaction hydration strategy marker. */
export declare const interaction: () => Strategy
/** Create a manual hydration strategy marker. */
export declare const manual: () => Strategy
/** Convert a strategy marker into neutral AST hydration metadata. */
export declare const boundary: (selectedStrategy: Strategy) => LoomCore.Ast.HydrationMetadata
/** Hydration strategy attribute name used in server/client handshakes. */
export declare const attributeName = "data-loom-hydrate"
/** Stable boundary id attribute emitted during SSR. */
export declare const boundaryIdAttributeName = "data-loom-boundary"
/** Stable event registry attribute emitted during SSR. */
export declare const eventNamesAttributeName = "data-loom-events"
/** Stable interactive node id attribute emitted during SSR. */
export declare const nodeIdAttributeName = "data-loom-node"
/** Stable per-node event metadata emitted during SSR. */
export declare const nodeEventNamesAttributeName = "data-loom-node-events"
/** Discover hydratable boundaries from SSR markup. */
export declare const discover: (root: ParentNode) => ReadonlyArray<Boundary>
/** Normalize the current DOM root into a bootstrap plan. */
export declare const bootstrap: (root: ParentNode) => BootstrapResult
/** Activate discovered hydratable boundaries against the current SSR activation source. */
export declare const activate: (
  root: ParentNode,
  source: ActivationInput,
  options?: ActivationOptions,
) => ActivationResult
