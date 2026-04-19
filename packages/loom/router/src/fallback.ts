import type * as Loom from "@effectify/loom"
import * as internal from "./internal/fallback.js"

export type Content<Input = unknown> = Loom.Html.Child | ((input: Input) => Loom.Html.Child)

/** Fallback definition used when no route matches the current location. */
export type Definition<Content = unknown> = internal.FallbackDefinition<Content>

export interface Boundaries {
  readonly notFound?: Definition
  readonly invalidInput?: Definition
}

export type Config = Definition | Boundaries

/** Create a router fallback boundary. */
export const make = <Content>(content: Content): Definition<Content> => internal.makeFallback(content)

/** Read the fallback content payload. */
export const content = <Content>(self: Definition<Content>): Content => self.content
