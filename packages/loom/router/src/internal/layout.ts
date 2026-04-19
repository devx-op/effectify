import type * as Layout from "../layout.js"

export interface LayoutDefinition<Context = unknown> {
  readonly _tag: "LoomRouterLayout"
  readonly content: Layout.Content<Context>
  readonly name: string | undefined
}

export const makeLayout = <Context = unknown>(content: Layout.Content<Context>): LayoutDefinition<Context> => ({
  _tag: "LoomRouterLayout",
  content,
  name: typeof content === "string" ? content : undefined,
})
