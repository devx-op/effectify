import type * as LoomCore from "@effectify/loom-core"
import type * as Runtime from "../runtime.js"
export declare const startMarker: (id: string) => string
export declare const endMarker: (id: string) => string
export declare const wrapHtml: (id: string, html: string) => string
export declare const makePlan: (id: string, boundaryId: string | undefined) => Runtime.LiveRegionPlan
export declare const stripRuntimeManagedAttributes: (
  attributes: Readonly<Record<string, string>>,
) => Record<string, string>
export type UnsupportedReason = "nested-live" | "event-binding" | "hydration-boundary"
export type StaticSerializationResult = {
  readonly _tag: "Supported"
  readonly html: string
} | {
  readonly _tag: "Unsupported"
  readonly reason: UnsupportedReason
}
export declare const collectLiveNodes: (node: LoomCore.Ast.Node) => ReadonlyArray<LoomCore.Ast.LiveNode<unknown>>
export declare const serializeStaticNode: (node: LoomCore.Ast.Node) => StaticSerializationResult
