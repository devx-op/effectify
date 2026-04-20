import type * as Ast from "./ast.js"
/** Internal-neutral component contract used by the public Loom package. */
export interface Definition {
  readonly _tag: "Component"
  readonly node: Ast.Node
  readonly capabilities: ReadonlyArray<Capability>
}
export interface EffectCapability {
  readonly _tag: "ComponentEffect"
  readonly effect: EffectLike
}
export type Capability = EffectCapability
export interface EffectLike {
  readonly _tag: string
}
/** Create a component definition from a neutral AST node. */
export declare const make: (node: Ast.Node) => Definition
/** Backwards-compatible alias kept while the public API settles. */
export declare const fromNode: (node: Ast.Node) => Definition
/** Attach an Effect capability to a component definition. */
export declare const effect: (componentEffect: EffectLike) => EffectCapability
/** Attach a capability to a component definition. */
export declare const use: (definition: Definition, capability: Capability) => Definition
