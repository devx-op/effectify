import * as LoomCore from "@effectify/loom-core"
import * as LoomRuntime from "@effectify/loom-runtime"
const makeStrategy = (name) => LoomRuntime.Hydration.marker(name)
/** First-class hydration strategy helpers kept close to the public API. */
export const strategy = {
  visible: () => makeStrategy("visible"),
  idle: () => makeStrategy("idle"),
  interaction: () => makeStrategy("interaction"),
  manual: () => makeStrategy("manual"),
}
/** Create a visible hydration strategy marker. */
export const visible = () => strategy.visible()
/** Create an idle hydration strategy marker. */
export const idle = () => strategy.idle()
/** Create an interaction hydration strategy marker. */
export const interaction = () => strategy.interaction()
/** Create a manual hydration strategy marker. */
export const manual = () => strategy.manual()
/** Convert a strategy marker into neutral AST hydration metadata. */
export const boundary = (selectedStrategy) =>
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
export const discover = (root) => LoomRuntime.Runtime.discoverHydrationBoundaries(root)
/** Normalize the current DOM root into a bootstrap plan. */
export const bootstrap = (root) => {
  const result = LoomRuntime.Runtime.bootstrapHydration(root)
  return {
    ...result,
    diagnosticSummary: result.diagnostics.map(LoomRuntime.Diagnostics.summarize),
  }
}
/** Activate discovered hydratable boundaries against the current SSR activation source. */
export const activate = (root, source, options) => {
  const result = LoomRuntime.Runtime.activateHydration(root, source, options)
  return {
    ...result,
    diagnosticSummary: result.diagnostics.map(LoomRuntime.Diagnostics.summarize),
  }
}
