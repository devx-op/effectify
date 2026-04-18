import type { AtomRegistry, Hydration as ReactivityHydration } from "effect/unstable/reactivity"
import type * as LoomCore from "@effectify/loom-core"
import * as internal from "./internal/runtime.js"

/** Minimal runtime boundary for future DOM/SSR executors. */
export interface Handle {
  readonly root: Element | DocumentFragment | null
}

export interface EventContext<Target extends EventTarget = EventTarget, EventType extends Event = Event> {
  readonly event: EventType
  readonly target: Target
  readonly runtime: Handle
}

export interface EventBinding<Handler = unknown> extends LoomCore.Ast.EventBinding<Handler> {}

export interface RegisteredEventBinding {
  readonly nodeId: string
  readonly event: string
  readonly mode: LoomCore.Ast.EventBinding["mode"]
  readonly handler: LoomCore.Ast.EventBinding["handler"]
}

export interface HydrationBoundary {
  readonly id: string
  readonly strategy: string
  readonly attributes: Readonly<Record<string, string>>
  readonly eventBindings: ReadonlyArray<RegisteredEventBinding>
}

export interface ActivationEventBinding {
  readonly nodeId: string
  readonly event: string
  readonly mode: LoomCore.Ast.EventBinding["mode"]
  readonly handlerId: string
}

export interface ActivationBoundary {
  readonly id: string
  readonly strategy: string
  readonly eventBindings: ReadonlyArray<ActivationEventBinding>
}

export interface ActivationManifest {
  readonly boundaries: ReadonlyArray<ActivationBoundary>
  readonly deferred: ReadonlyArray<DeferredNode>
}

export interface ActivationSource {
  readonly manifest: ActivationManifest
  readonly handlers: Readonly<Record<string, LoomCore.Ast.EventBinding["handler"]>>
}

export interface DeferredNode {
  readonly id: string
  readonly kind: "live"
  readonly reason: "activation-pending"
}

export interface LiveRegionPlan {
  readonly id: string
  readonly boundaryId: string | undefined
  readonly startMarker: string
  readonly endMarker: string
}

export interface RenderPlan {
  readonly root: LoomCore.Ast.Node
  readonly hydrationAttributes: ReadonlyArray<readonly [key: string, value: string]>
  readonly boundaries: ReadonlyArray<HydrationBoundary>
  readonly liveRegions: ReadonlyArray<LiveRegionPlan>
  readonly deferred: ReadonlyArray<DeferredNode>
}

export interface SsrOptions {
  readonly registry?: AtomRegistry.AtomRegistry
  readonly dehydrate?: {
    readonly encodeInitialAs?: "ignore" | "promise" | "value-only"
  }
}

export interface SsrRenderResult {
  readonly html: string
  readonly plan: RenderPlan
  readonly activation: ActivationSource
  readonly dehydratedAtoms: ReadonlyArray<ReactivityHydration.DehydratedAtom>
}

export interface HydrationBoundaryHandle {
  readonly id: string
  readonly strategy: string
  readonly element: Element
  readonly eventNames: ReadonlyArray<string>
  readonly startMarker: Comment | undefined
  readonly endMarker: Comment | undefined
}

export interface HydrationMismatch {
  readonly id: string
  readonly reason: "missing-strategy" | "missing-start-marker" | "missing-end-marker"
  readonly element: Element
}

export interface HydrationBootstrapResult {
  readonly boundaries: ReadonlyArray<HydrationBoundaryHandle>
  readonly mismatches: ReadonlyArray<HydrationMismatch>
}

export interface ActivatedEventBinding {
  readonly nodeId: string
  readonly event: string
  readonly mode: LoomCore.Ast.EventBinding["mode"]
  readonly element: Element
}

export interface ActivatedBoundary extends HydrationBoundaryHandle {
  readonly eventBindings: ReadonlyArray<ActivatedEventBinding>
}

export interface HydrationActivationIssue {
  readonly boundaryId: string
  readonly liveRegionId?: string
  readonly nodeId: string
  readonly event: string
  readonly reason:
    | "missing-runtime-boundary"
    | "missing-event-target"
    | "missing-handler"
    | "missing-effect-dispatcher"
    | "missing-live-start-marker"
    | "missing-live-end-marker"
    | "unsupported-live-content"
    | "live-plan-mismatch"
}

export interface HydrationActivationOptions {
  readonly onEffect?: (effect: LoomCore.Component.EffectLike, context: EventContext) => void
  readonly registry?: AtomRegistry.AtomRegistry
  readonly dehydratedState?: Iterable<ReactivityHydration.DehydratedAtom>
}

export interface ActivatedLiveRegion {
  readonly id: string
  readonly boundaryId: string | undefined
  readonly startMarker: Comment
  readonly endMarker: Comment
  readonly unsubscribe: () => void
}

export interface HydrationActivationResult {
  readonly boundaries: ReadonlyArray<ActivatedBoundary>
  readonly liveRegions: ReadonlyArray<ActivatedLiveRegion>
  readonly mismatches: ReadonlyArray<HydrationMismatch>
  readonly issues: ReadonlyArray<HydrationActivationIssue>
  readonly deferred: ReadonlyArray<DeferredNode>
  readonly registry: AtomRegistry.AtomRegistry
  readonly dispose: () => void
}

/** Normalize a handler into a runtime-aware event binding descriptor. */
export const eventBinding = <Handler>(event: string, handler: Handler): EventBinding<Handler> =>
  internal.makeEventBinding(event, handler)

/** Create a render plan without executing runtime semantics yet. */
export const plan = (root: LoomCore.Ast.Node, options?: SsrOptions): RenderPlan =>
  internal.makeRenderPlan(root, options)

/** Render the current neutral tree to SSR HTML plus explicit hydration metadata. */
export const renderToHtml = (root: LoomCore.Ast.Node, options?: SsrOptions): SsrRenderResult =>
  internal.renderToHtml(root, options)

/** Discover hydratable boundaries from SSR markup. */
export const discoverHydrationBoundaries = (root: ParentNode): ReadonlyArray<HydrationBoundaryHandle> =>
  internal.discoverHydrationBoundaries(root)

/** Normalize the current DOM root into a hydration bootstrap plan. */
export const bootstrapHydration = (root: ParentNode): HydrationBootstrapResult => internal.bootstrapHydration(root)

/** Activate discovered hydration boundaries against the current hydration activation source. */
export const activateHydration = (
  root: ParentNode,
  source: ActivationSource | SsrRenderResult,
  options?: HydrationActivationOptions,
): HydrationActivationResult => internal.activateHydration(root, source, options)
