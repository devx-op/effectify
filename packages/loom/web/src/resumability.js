import * as LoomRuntime from "@effectify/loom-runtime"
/**
 * Advanced resumability surface.
 *
 * Resumability stays public and important, but it is intentionally documented
 * as a layered capability after the root interactive happy path.
 */
/** Create a stable executable ref (<module>#<export>) for resumable handlers/live regions. */
export const makeExecutableRef = LoomRuntime.Resumability.makeExecutableRef
/** Attach a stable resumability ref to an event handler used by `Html.on(...)`. */
export const handler = LoomRuntime.Resumability.handler
/** Attach a stable resumability ref to a live-region renderer used by `Html.live(...)`. */
export const live = LoomRuntime.Resumability.liveRegion
/** Create a local executable registry for browser resumability bootstrap. */
export const makeLocalRegistry = LoomRuntime.Resumability.makeLocalRegistry
/** Register a local handler implementation under a stable resumability ref. */
export const registerHandler = LoomRuntime.Resumability.registerHandler
/** Register a local live-region executable under a stable resumability ref. */
export const registerLiveRegion = LoomRuntime.Resumability.registerLiveRegion
/** Resolve a local handler implementation from the resumability registry. */
export const resolveHandler = LoomRuntime.Resumability.resolveHandler
/** Resolve a local live-region executable from the resumability registry. */
export const resolveLiveRegion = LoomRuntime.Resumability.resolveLiveRegion
/** Encode a validated resumability contract into a JSON payload. */
export const encodeContract = LoomRuntime.Resumability.encodeContract
/** Decode and validate a resumability payload JSON string. */
export const decodeContract = LoomRuntime.Resumability.decodeContract
/** Materialize a resumability contract from SSR render output plus build/root identity. */
export const createRenderContract = async (render, identity) => {
  const result = await LoomRuntime.Runtime.createResumabilityContract(render, identity)
  return {
    ...result,
    diagnostics: render.diagnostics,
    diagnosticSummary: render.diagnostics.map(LoomRuntime.Diagnostics.summarize),
  }
}
