import * as LoomCore from "@effectify/loom-core"

/** Public Loom component definition. */
export type Type = LoomCore.Component.Definition

/** Public Loom component capability. */
export type Capability = LoomCore.Component.Capability

/** Create a component from a neutral AST node. */
export const make = (node: LoomCore.Ast.Node): Type => LoomCore.Component.make(node)

/** Backwards-compatible alias kept while the public API settles. */
export const fromNode = make

/** Create an Effect-backed component capability. */
export const effect = (
  componentEffect: LoomCore.Component.EffectLike,
): Capability => LoomCore.Component.effect(componentEffect)

/**
 * Attach a capability to a component.
 * Supports both data-first and data-last usage.
 */
export function use(capability: Capability): (self: Type) => Type
export function use(self: Type, capability: Capability): Type
export function use(selfOrCapability: Type | Capability, capability?: Capability) {
  if (capability === undefined) {
    if (selfOrCapability._tag === "ComponentEffect") {
      return (self: Type): Type => LoomCore.Component.use(self, selfOrCapability)
    }

    return (self: Type): Type => self
  }

  if (selfOrCapability._tag === "Component") {
    return LoomCore.Component.use(selfOrCapability, capability)
  }

  return make(LoomCore.Ast.text(""))
}
