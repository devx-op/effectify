import * as internal from "./internal/layout.js"
import type * as Renderable from "./renderable.js"

export interface Input<Context = unknown> {
  readonly child: Renderable.Type
  readonly context: Context
}

export type Content<Context = unknown> = Renderable.Content<Input<Context>>

/** Minimal layout boundary that can wrap a matched route later in the runtime slice. */
export type Definition<Context = unknown> = internal.LayoutDefinition<Context>

/** Create a named layout boundary. */
export const make = <Context = unknown>(content: Content<Context>): Definition<Context> => internal.makeLayout(content)

/** Read the stable layout name. */
export const name = (self: Definition): string | undefined => self.name
