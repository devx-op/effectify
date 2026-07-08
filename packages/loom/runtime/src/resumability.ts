import type { Atom } from "effect/unstable/reactivity"
import type * as LoomCore from "@effectify/loom-core"
import * as contract from "./internal/resumability-contract.js"
import {
  DuplicateExecutableRefError,
  makeLocalRegistry as makeLocalRegistryInternal,
  MissingHandlerRefError,
  MissingLiveRegionRefError,
  registerHandler as registerHandlerInternal,
  registerLiveRegion as registerLiveRegionInternal,
  resolveHandler as resolveHandlerInternal,
  resolveLiveRegion as resolveLiveRegionInternal,
} from "./internal/resumability-registry.js"

export type ExecutableRef = string

export interface BoundaryDescriptor {
  readonly id: string
  readonly strategy: string
  readonly nodeIds: ReadonlyArray<string>
}

export interface HandlerDescriptor {
  readonly ref: ExecutableRef
  readonly boundaryId: string
  readonly nodeId: string
  readonly event: string
  readonly mode: LoomCore.Ast.EventBinding["mode"]
}

export interface LiveRegionDescriptor {
  readonly id: string
  readonly boundaryId?: string
  readonly ref: ExecutableRef
  readonly atomKey: string
  readonly startMarker: string
  readonly endMarker: string
}

export interface DeferredDescriptor {
  readonly id: string
  readonly kind: "live"
  readonly reason: "activation-pending"
}

export interface ReferencedHandler<Handler = HandlerExecutable> {
  readonly _tag: "ReferencedHandler"
  readonly ref: ExecutableRef
  readonly handler: Handler
}

export interface ReferencedLiveRegion<Value = unknown> {
  readonly _tag: "ReferencedLiveRegion"
  readonly ref: ExecutableRef
  readonly render: (value: Value) => LoomCore.Ast.Node
}

export interface SerializedState {
  readonly dehydratedAtoms: ReadonlyArray<unknown>
  readonly deferred: ReadonlyArray<DeferredDescriptor>
}

export interface SerializedStateInput extends SerializedState {
  readonly [key: string]: unknown
}

export interface ContractDraft {
  readonly buildId: string
  readonly rootId: string
  readonly boundaries: ReadonlyArray<BoundaryDescriptor>
  readonly handlers: ReadonlyArray<HandlerDescriptor>
  readonly liveRegions: ReadonlyArray<LiveRegionDescriptor>
  readonly state: SerializedStateInput
  readonly [key: string]: unknown
}

export interface RenderContractDraft {
  readonly boundaries: ReadonlyArray<BoundaryDescriptor>
  readonly handlers: ReadonlyArray<HandlerDescriptor>
  readonly liveRegions: ReadonlyArray<LiveRegionDescriptor>
  readonly state: SerializedStateInput
}

export interface IntegrityDescriptor {
  readonly algorithm: typeof integrityAlgorithm
  readonly payloadHash: string
}

export interface LoomResumabilityContract {
  readonly version: typeof contractVersion
  readonly buildId: string
  readonly rootId: string
  readonly boundaries: ReadonlyArray<BoundaryDescriptor>
  readonly handlers: ReadonlyArray<HandlerDescriptor>
  readonly liveRegions: ReadonlyArray<LiveRegionDescriptor>
  readonly state: SerializedState
  readonly integrity: IntegrityDescriptor
}

export type ContractValidationReason =
  | "missing-field"
  | "invalid-json"
  | "version-mismatch"
  | "build-id-mismatch"
  | "integrity-mismatch"
  | "missing-local-handler-ref"
  | "missing-local-live-region-ref"
  | "non-serializable-state"

export interface ContractValidationIssue {
  readonly path: string
  readonly reason: ContractValidationReason
  readonly message: string
}

export interface ContractValidationOptions {
  readonly expectedVersion?: number
  readonly expectedBuildId?: string
  readonly registry?: LocalRegistry
}

export interface ValidContractResult {
  readonly status: "valid"
  readonly contract: LoomResumabilityContract
  readonly issues: ReadonlyArray<never>
}

export interface InvalidContractResult {
  readonly status: "invalid"
  readonly contract?: LoomResumabilityContract
  readonly issues: ReadonlyArray<ContractValidationIssue>
}

export interface FreshStartContractResult {
  readonly status: "fresh-start"
  readonly contract: LoomResumabilityContract
  readonly issues: ReadonlyArray<ContractValidationIssue>
}

export type ContractValidationResult = ValidContractResult | InvalidContractResult | FreshStartContractResult

export type HandlerExecutable = LoomCore.Ast.EventBinding["handler"]

export type LiveRegionRenderer = (value: unknown) => LoomCore.Ast.Node

export interface LiveRegionExecutable {
  readonly atom: Atom.Atom<unknown>
  readonly render: LiveRegionRenderer
}

export interface LocalRegistry {
  readonly handlers: Map<ExecutableRef, HandlerExecutable>
  readonly liveRegions: Map<ExecutableRef, LiveRegionExecutable>
}

export type RenderResumabilityIssueReason =
  | "missing-handler-ref"
  | "missing-live-region-ref"
  | "non-serializable-live-atom"

export interface RenderResumabilityIssue {
  readonly path: string
  readonly reason: RenderResumabilityIssueReason
  readonly message: string
}

export interface ReadyRenderResumability {
  readonly status: "ready"
  readonly draft: RenderContractDraft
  readonly issues: ReadonlyArray<never>
}

export interface UnsupportedRenderResumability {
  readonly status: "unsupported"
  readonly issues: ReadonlyArray<RenderResumabilityIssue>
}

export interface EmptyRenderResumability {
  readonly status: "none"
  readonly issues: ReadonlyArray<never>
}

export type RenderResumabilityResult = ReadyRenderResumability | UnsupportedRenderResumability | EmptyRenderResumability

export interface ReadyCreatedContractResult {
  readonly status: "ready"
  readonly contract: LoomResumabilityContract
  readonly issues: ReadonlyArray<never>
}

export interface UnsupportedCreatedContractResult {
  readonly status: "unsupported"
  readonly issues: ReadonlyArray<RenderResumabilityIssue>
}

export interface EmptyCreatedContractResult {
  readonly status: "none"
  readonly issues: ReadonlyArray<never>
}

export type CreatedRenderContractResult =
  | ReadyCreatedContractResult
  | UnsupportedCreatedContractResult
  | EmptyCreatedContractResult

export interface ResumabilityActivationSource {
  readonly contract: LoomResumabilityContract
  readonly localRegistry: LocalRegistry
}

export const contractVersion: 1 = contract.contractVersion

export const integrityAlgorithm: "sha256" = contract.integrityAlgorithm

export const executableRefPattern = contract.executableRefPattern

export const makeExecutableRef = contract.makeExecutableRef

export const isStableExecutableRef = contract.isStableExecutableRef

export const createContract = contract.createContract

export const encodeContract = contract.encodeContract

export const validateContract = contract.validateContract

export const decodeContract = contract.decodeContract

export { DuplicateExecutableRefError, MissingHandlerRefError, MissingLiveRegionRefError }

export const handler = <Handler>(ref: ExecutableRef, value: Handler): ReferencedHandler<Handler> => ({
  _tag: "ReferencedHandler",
  ref,
  handler: value,
})

export const liveRegion = <Value>(
  ref: ExecutableRef,
  render: (value: Value) => LoomCore.Ast.Node,
): ReferencedLiveRegion<Value> => ({
  _tag: "ReferencedLiveRegion",
  ref,
  render,
})

export const makeLocalRegistry = (): LocalRegistry => makeLocalRegistryInternal()

export const registerHandler = (
  registry: LocalRegistry,
  ref: ExecutableRef,
  handler: HandlerExecutable,
): LocalRegistry => registerHandlerInternal(registry, ref, handler)

export const registerLiveRegion = <Value>(
  registry: LocalRegistry,
  ref: ExecutableRef,
  atom: Atom.Atom<Value>,
  render: LiveRegionRenderer,
): LocalRegistry => registerLiveRegionInternal(registry, ref, atom, render)

export const resolveHandler = (registry: LocalRegistry, ref: ExecutableRef): HandlerExecutable =>
  resolveHandlerInternal(registry, ref)

export const resolveLiveRegion = (registry: LocalRegistry, ref: ExecutableRef): LiveRegionExecutable =>
  resolveLiveRegionInternal(registry, ref)
