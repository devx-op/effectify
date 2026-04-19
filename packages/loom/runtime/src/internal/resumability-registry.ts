import { Data } from "effect"
import type * as LoomCore from "@effectify/loom-core"
import type * as Resumability from "../resumability.js"

type ExecutableKind = "handler" | "live-region"

const ensureRefAvailable = <Value>(
  entries: Map<Resumability.ExecutableRef, Value>,
  ref: Resumability.ExecutableRef,
  kind: ExecutableKind,
): void => {
  if (entries.has(ref)) {
    throw new DuplicateExecutableRefError({ ref, kind })
  }
}

export class DuplicateExecutableRefError extends Data.TaggedError("DuplicateExecutableRefError")<{
  readonly ref: Resumability.ExecutableRef
  readonly kind: ExecutableKind
}> {}

export class MissingHandlerRefError extends Data.TaggedError("MissingHandlerRefError")<{
  readonly ref: Resumability.ExecutableRef
}> {}

export class MissingLiveRegionRefError extends Data.TaggedError("MissingLiveRegionRefError")<{
  readonly ref: Resumability.ExecutableRef
}> {}

export const makeLocalRegistry = (): Resumability.LocalRegistry => ({
  handlers: new Map<Resumability.ExecutableRef, LoomCore.Ast.EventBinding["handler"]>(),
  liveRegions: new Map<Resumability.ExecutableRef, Resumability.LiveRegionExecutable>(),
})

export const registerHandler = (
  registry: Resumability.LocalRegistry,
  ref: Resumability.ExecutableRef,
  handler: LoomCore.Ast.EventBinding["handler"],
): Resumability.LocalRegistry => {
  ensureRefAvailable(registry.handlers, ref, "handler")
  registry.handlers.set(ref, handler)
  return registry
}

export const registerLiveRegion = <Value>(
  registry: Resumability.LocalRegistry,
  ref: Resumability.ExecutableRef,
  atom: import("effect/unstable/reactivity").Atom.Atom<Value>,
  render: Resumability.LiveRegionRenderer,
): Resumability.LocalRegistry => {
  ensureRefAvailable(registry.liveRegions, ref, "live-region")
  registry.liveRegions.set(ref, {
    atom,
    render,
  })
  return registry
}

export const resolveHandler = (
  registry: Resumability.LocalRegistry,
  ref: Resumability.ExecutableRef,
): LoomCore.Ast.EventBinding["handler"] => {
  const handler = registry.handlers.get(ref)

  if (handler === undefined) {
    throw new MissingHandlerRefError({ ref })
  }

  return handler
}

export const resolveLiveRegion = (
  registry: Resumability.LocalRegistry,
  ref: Resumability.ExecutableRef,
): Resumability.LiveRegionExecutable => {
  const render = registry.liveRegions.get(ref)

  if (render === undefined) {
    throw new MissingLiveRegionRefError({ ref })
  }

  return render
}
