import type * as Loom from "@effectify/loom"
import * as internal from "./internal/layout.js"

export interface Input<Context = unknown> {
  readonly child: Loom.Html.Child
  readonly context: Context
}

export type Content<Context = unknown> = Loom.Html.Child | ((input: Input<Context>) => Loom.Html.Child)

/** Minimal layout boundary that can wrap a matched route later in the runtime slice. */
export type Definition<Context = unknown> = internal.LayoutDefinition<Context>

/** Create a named layout boundary. */
export const make = <Context = unknown>(content: Content<Context>): Definition<Context> => internal.makeLayout(content)

/** Read the stable layout name. */
export const name = (self: Definition): string | undefined => self.name
