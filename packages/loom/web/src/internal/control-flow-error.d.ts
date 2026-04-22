declare const MissingMountedRangeParentError_base: new<A extends Record<string, any> = {}>(
  args: import("effect/Types").VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>,
) => import("effect/Cause").YieldableError & {
  readonly _tag: "MissingMountedRangeParentError"
} & Readonly<A>
export declare class MissingMountedRangeParentError extends MissingMountedRangeParentError_base<{
  readonly owner: string
}> {
}
declare const MismatchedMountedRangeParentError_base: new<A extends Record<string, any> = {}>(
  args: import("effect/Types").VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>,
) => import("effect/Cause").YieldableError & {
  readonly _tag: "MismatchedMountedRangeParentError"
} & Readonly<A>
export declare class MismatchedMountedRangeParentError extends MismatchedMountedRangeParentError_base<{
  readonly owner: string
}> {
}
declare const DuplicateControlFlowKeyError_base: new<A extends Record<string, any> = {}>(
  args: import("effect/Types").VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>,
) => import("effect/Cause").YieldableError & {
  readonly _tag: "DuplicateControlFlowKeyError"
} & Readonly<A>
export declare class DuplicateControlFlowKeyError extends DuplicateControlFlowKeyError_base<{
  readonly owner: string
  readonly key: PropertyKey
}> {
}
