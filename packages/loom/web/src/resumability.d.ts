import * as LoomRuntime from "@effectify/loom-runtime"
import type * as Diagnostics from "./diagnostics.js"
/**
 * Advanced resumability surface.
 *
 * Resumability stays public and important, but it is intentionally documented
 * as a layered capability after the root interactive happy path.
 */
export type ExecutableRef = LoomRuntime.Resumability.ExecutableRef
export type ReferencedHandler<Handler = LoomRuntime.Resumability.HandlerExecutable> =
  LoomRuntime.Resumability.ReferencedHandler<Handler>
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
export declare const makeExecutableRef: (
  modulePath: string,
  exportName: string,
) => LoomRuntime.Resumability.ExecutableRef
/** Attach a stable resumability ref to an event handler used by `Html.on(...)`. */
export declare const handler: <Handler>(
  ref: LoomRuntime.Resumability.ExecutableRef,
  value: Handler,
) => LoomRuntime.Resumability.ReferencedHandler<Handler>
/** Attach a stable resumability ref to a live-region renderer used by `Html.live(...)`. */
export declare const live: <Value>(
  ref: LoomRuntime.Resumability.ExecutableRef,
  render: (value: Value) => import("@effectify/loom-core/Ast").Node,
) => LoomRuntime.Resumability.ReferencedLiveRegion<Value>
/** Create a local executable registry for browser resumability bootstrap. */
export declare const makeLocalRegistry: () => LoomRuntime.Resumability.LocalRegistry
/** Register a local handler implementation under a stable resumability ref. */
export declare const registerHandler: (
  registry: LoomRuntime.Resumability.LocalRegistry,
  ref: LoomRuntime.Resumability.ExecutableRef,
  handler: LoomRuntime.Resumability.HandlerExecutable,
) => LoomRuntime.Resumability.LocalRegistry
/** Register a local live-region executable under a stable resumability ref. */
export declare const registerLiveRegion: <Value>(
  registry: LoomRuntime.Resumability.LocalRegistry,
  ref: LoomRuntime.Resumability.ExecutableRef,
  atom: import("effect/unstable/reactivity/Atom").Atom<Value>,
  render: LoomRuntime.Resumability.LiveRegionRenderer,
) => LoomRuntime.Resumability.LocalRegistry
/** Resolve a local handler implementation from the resumability registry. */
export declare const resolveHandler: (
  registry: LoomRuntime.Resumability.LocalRegistry,
  ref: LoomRuntime.Resumability.ExecutableRef,
) => LoomRuntime.Resumability.HandlerExecutable
/** Resolve a local live-region executable from the resumability registry. */
export declare const resolveLiveRegion: (
  registry: LoomRuntime.Resumability.LocalRegistry,
  ref: LoomRuntime.Resumability.ExecutableRef,
) => LoomRuntime.Resumability.LiveRegionExecutable
/** Encode a validated resumability contract into a JSON payload. */
export declare const encodeContract: (contract: LoomRuntime.Resumability.LoomResumabilityContract) => string
/** Decode and validate a resumability payload JSON string. */
export declare const decodeContract: (
  json: string,
  options?: LoomRuntime.Resumability.ContractValidationOptions,
) => Promise<LoomRuntime.Resumability.ContractValidationResult>
/** Materialize a resumability contract from SSR render output plus build/root identity. */
export declare const createRenderContract: (
  render: LoomRuntime.Runtime.SsrRenderResult,
  identity: LoomRuntime.Runtime.ResumabilityIdentity,
) => Promise<CreatedRenderContractResult>
