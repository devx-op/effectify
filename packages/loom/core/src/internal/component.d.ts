import type * as Component from "../component.js"
import type * as Ast from "../ast.js"
export declare const makeDefinition: (node: Ast.Node) => Component.Definition
export declare const appendCapability: (
  definition: Component.Definition,
  capability: Component.Capability,
) => Component.Definition
export declare const makeEffectCapability: (effect: Component.EffectCapability["effect"]) => Component.EffectCapability
