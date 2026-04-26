import { Data } from "effect"
const ensureRefAvailable = (entries, ref, kind) => {
  if (entries.has(ref)) {
    throw new DuplicateExecutableRefError({ ref, kind })
  }
}
export class DuplicateExecutableRefError extends Data.TaggedError("DuplicateExecutableRefError") {
}
export class MissingHandlerRefError extends Data.TaggedError("MissingHandlerRefError") {
}
export class MissingLiveRegionRefError extends Data.TaggedError("MissingLiveRegionRefError") {
}
export const makeLocalRegistry = () => ({
  handlers: new Map(),
  liveRegions: new Map(),
})
export const registerHandler = (registry, ref, handler) => {
  ensureRefAvailable(registry.handlers, ref, "handler")
  registry.handlers.set(ref, handler)
  return registry
}
export const registerLiveRegion = (registry, ref, atom, render) => {
  ensureRefAvailable(registry.liveRegions, ref, "live-region")
  registry.liveRegions.set(ref, {
    atom,
    render,
  })
  return registry
}
export const resolveHandler = (registry, ref) => {
  const handler = registry.handlers.get(ref)
  if (handler === undefined) {
    throw new MissingHandlerRefError({ ref })
  }
  return handler
}
export const resolveLiveRegion = (registry, ref) => {
  const render = registry.liveRegions.get(ref)
  if (render === undefined) {
    throw new MissingLiveRegionRefError({ ref })
  }
  return render
}
