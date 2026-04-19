import * as LoomRuntime from "@effectify/loom-runtime"
import type * as Diagnostics from "./diagnostics.js"

export type ExecutableRef = LoomRuntime.Resumability.ExecutableRef
export type ReferencedHandler<Handler = LoomRuntime.Resumability.HandlerExecutable> =
  LoomRuntime.Resumability.ReferencedHandler<
    Handler
  >
export type ReferencedLiveRegion<Value = unknown> = LoomRuntime.Resumability.ReferencedLiveRegion<Value>
export type LocalRegistry = LoomRuntime.Resumability.LocalRegistry
export type LiveRegionExecutable = LoomRuntime.Resumability.LiveRegionExecutable
export type LoomResumabilityContract = LoomRuntime.Resumability.LoomResumabilityContract
export type ContractValidationResult = LoomRuntime.Resumability.ContractValidationResult
export type ContractValidationOptions = LoomRuntime.Resumability.ContractValidationOptions

export interface ReadyCreatedRenderContractResult extends LoomRuntime.Resumability.ReadyCreatedContractResult {
  readonly diagnostics: ReadonlyArray<Diagnostics.Report>
  readonly diagnosticSummary: ReadonlyArray<Diagnostics.Summary>
}

export interface UnsupportedCreatedRenderContractResult
  extends LoomRuntime.Resumability.UnsupportedCreatedContractResult
{
  readonly diagnostics: ReadonlyArray<Diagnostics.Report>
  readonly diagnosticSummary: ReadonlyArray<Diagnostics.Summary>
}

export interface EmptyCreatedRenderContractResult extends LoomRuntime.Resumability.EmptyCreatedContractResult {
  readonly diagnostics: ReadonlyArray<Diagnostics.Report>
  readonly diagnosticSummary: ReadonlyArray<Diagnostics.Summary>
}

export type CreatedRenderContractResult =
  | ReadyCreatedRenderContractResult
  | UnsupportedCreatedRenderContractResult
  | EmptyCreatedRenderContractResult

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
export const createRenderContract = async (
  render: LoomRuntime.Runtime.SsrRenderResult,
  identity: LoomRuntime.Runtime.ResumabilityIdentity,
): Promise<CreatedRenderContractResult> => {
  const result = await LoomRuntime.Runtime.createResumabilityContract(render, identity)

  return {
    ...result,
    diagnostics: render.diagnostics,
    diagnosticSummary: render.diagnostics.map(LoomRuntime.Diagnostics.summarize),
  }
}
