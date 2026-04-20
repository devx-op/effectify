import type * as Loom from "@effectify/loom"

/** Shared vNext-compatible renderable contract for Loom router surfaces. */
export type Type = Loom.View.Child

/** Shared vNext-compatible resolver contract for router renderables. */
export type Resolver<Input = unknown> = (input: Input) => Type

/** Shared vNext-compatible content contract for router renderables. */
export type Content<Input = unknown> = Type | Resolver<Input>
