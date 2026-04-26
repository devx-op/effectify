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
export const contractVersion = contract.contractVersion
export const integrityAlgorithm = contract.integrityAlgorithm
export const executableRefPattern = contract.executableRefPattern
export const makeExecutableRef = contract.makeExecutableRef
export const isStableExecutableRef = contract.isStableExecutableRef
export const createContract = contract.createContract
export const encodeContract = contract.encodeContract
export const validateContract = contract.validateContract
export const decodeContract = contract.decodeContract
export { DuplicateExecutableRefError, MissingHandlerRefError, MissingLiveRegionRefError }
export const handler = (ref, value) => ({
  _tag: "ReferencedHandler",
  ref,
  handler: value,
})
export const liveRegion = (ref, render) => ({
  _tag: "ReferencedLiveRegion",
  ref,
  render,
})
export const makeLocalRegistry = () => makeLocalRegistryInternal()
export const registerHandler = (registry, ref, handler) => registerHandlerInternal(registry, ref, handler)
export const registerLiveRegion = (registry, ref, atom, render) =>
  registerLiveRegionInternal(registry, ref, atom, render)
export const resolveHandler = (registry, ref) => resolveHandlerInternal(registry, ref)
export const resolveLiveRegion = (registry, ref) => resolveLiveRegionInternal(registry, ref)
