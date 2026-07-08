import type * as Ast from "./ast.js"
/** Internal-neutral component contract used by the public Loom package. */
export interface Component {
  readonly _tag: "Component"
  readonly node: Ast.Node
  readonly capabilities: ReadonlyArray<Capability>
}
/** Backwards-compatible alias kept while the public API settles. */
export type Definition = Component
export interface EffectCapability {
  readonly _tag: "ComponentEffect"
  readonly effect: EffectLike
}
export type Capability = EffectCapability
export interface EffectLike {
  readonly _tag: string
}
/** Create a component definition from a neutral AST node. */
export declare const make: (node: Ast.Node) => Component
/** Backwards-compatible alias kept while the public API settles. */
export declare const fromNode: (node: Ast.Node) => Component
/** Attach an Effect capability to a component definition. */
export declare const effect: (componentEffect: EffectLike) => EffectCapability
/** Attach a capability to a component definition. */
export declare const use: (definition: Component, capability: Capability) => Component
