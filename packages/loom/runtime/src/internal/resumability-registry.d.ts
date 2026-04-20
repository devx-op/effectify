import type * as LoomCore from "@effectify/loom-core"
import type * as Resumability from "../resumability.js"
type ExecutableKind = "handler" | "live-region"
declare const DuplicateExecutableRefError_base: new<A extends Record<string, any> = {}>(
  args: import("effect/Types").VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>,
) => import("effect/Cause").YieldableError & {
  readonly _tag: "DuplicateExecutableRefError"
} & Readonly<A>
export declare class DuplicateExecutableRefError extends DuplicateExecutableRefError_base<{
  readonly ref: Resumability.ExecutableRef
  readonly kind: ExecutableKind
}> {
}
declare const MissingHandlerRefError_base: new<A extends Record<string, any> = {}>(
  args: import("effect/Types").VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>,
) => import("effect/Cause").YieldableError & {
  readonly _tag: "MissingHandlerRefError"
} & Readonly<A>
export declare class MissingHandlerRefError extends MissingHandlerRefError_base<{
  readonly ref: Resumability.ExecutableRef
}> {
}
declare const MissingLiveRegionRefError_base: new<A extends Record<string, any> = {}>(
  args: import("effect/Types").VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>,
) => import("effect/Cause").YieldableError & {
  readonly _tag: "MissingLiveRegionRefError"
} & Readonly<A>
export declare class MissingLiveRegionRefError extends MissingLiveRegionRefError_base<{
  readonly ref: Resumability.ExecutableRef
}> {
}
export declare const makeLocalRegistry: () => Resumability.LocalRegistry
export declare const registerHandler: (
  registry: Resumability.LocalRegistry,
  ref: Resumability.ExecutableRef,
  handler: LoomCore.Ast.EventBinding["handler"],
) => Resumability.LocalRegistry
export declare const registerLiveRegion: <Value>(
  registry: Resumability.LocalRegistry,
  ref: Resumability.ExecutableRef,
  atom: import("effect/unstable/reactivity").Atom.Atom<Value>,
  render: Resumability.LiveRegionRenderer,
) => Resumability.LocalRegistry
export declare const resolveHandler: (
  registry: Resumability.LocalRegistry,
  ref: Resumability.ExecutableRef,
) => LoomCore.Ast.EventBinding["handler"]
export declare const resolveLiveRegion: (
  registry: Resumability.LocalRegistry,
  ref: Resumability.ExecutableRef,
) => Resumability.LiveRegionExecutable
