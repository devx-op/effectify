import type * as Decode from "./decode.js"
import type * as Fallback from "./fallback.js"
import type * as Layout from "./layout.js"
import * as internal from "./internal/route-dsl.js"

export type AbsolutePath = "/" | `/${string}`

export type RelativePath = string

export type Path = AbsolutePath | RelativePath | ""

export type Params = Readonly<Record<string, string>>

export type SearchValue = string | ReadonlyArray<string>

export type Search = Readonly<Record<string, SearchValue>>

export interface DecodeOptions<ParamsOutput extends Params = Params, SearchOutput extends Search = Search> {
  readonly params?: Decode.DecoderLike<Params, ParamsOutput>
  readonly search?: Decode.DecoderLike<Search, SearchOutput>
}

interface CommonOptions<Content, ParamsOutput extends Params, SearchOutput extends Search> {
  readonly content: Content
  readonly decode?: DecodeOptions<ParamsOutput, SearchOutput>
  readonly children?: ReadonlyArray<Definition>
  readonly layout?: Layout.Definition
  readonly fallback?: Fallback.Config
}

export interface Options<Content = unknown, ParamsOutput extends Params = Params, SearchOutput extends Search = Search>
  extends CommonOptions<Content, ParamsOutput, SearchOutput>
{
  readonly path: AbsolutePath
}

export interface ChildOptions<
  Content = unknown,
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
> extends CommonOptions<Content, ParamsOutput, SearchOutput> {
  readonly path: RelativePath
}

export interface IndexOptions<
  Content = unknown,
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
> extends CommonOptions<Content, ParamsOutput, SearchOutput> {}

export class UnsupportedPathError extends Error {
  readonly _tag = "LoomRouterUnsupportedPathError"

  constructor(message: string) {
    super(message)
    this.name = "UnsupportedPathError"
  }
}

/** Public route definition contract for the initial router DSL. */
export type Definition<Content = unknown, ParamsOutput extends Params = Params, SearchOutput extends Search = Search> =
  internal.RouteDefinition<Content, ParamsOutput, SearchOutput>

/** Extract the content type stored on a route definition. */
export type Content<Self extends Definition<any, any, any>> = Self extends Definition<infer Value, any, any> ? Value
  : never

/** Extract the decoded params type stored on a route definition. */
export type ParamsOf<Self extends Definition<any, any, any>> = Self extends Definition<any, infer Value, any> ? Value
  : never

/** Extract the decoded search type stored on a route definition. */
export type SearchOf<Self extends Definition<any, any, any>> = Self extends Definition<any, any, infer Value> ? Value
  : never

/** Create a route definition for the initial Loom router DSL. */
export const make = <Content, ParamsOutput extends Params = Params, SearchOutput extends Search = Search>(
  options: Options<Content, ParamsOutput, SearchOutput>,
): Definition<Content, ParamsOutput, SearchOutput> => internal.makeRoute(options)

/** Create a nested child route that contributes a single relative path segment. */
export const child = <Content, ParamsOutput extends Params = Params, SearchOutput extends Search = Search>(
  options: ChildOptions<Content, ParamsOutput, SearchOutput>,
): Definition<Content, ParamsOutput, SearchOutput> => internal.makeChildRoute(options)

/** Create an index child route that matches the parent path exactly. */
export const index = <Content, ParamsOutput extends Params = Params, SearchOutput extends Search = Search>(
  options: IndexOptions<Content, ParamsOutput, SearchOutput>,
): Definition<Content, ParamsOutput, SearchOutput> => internal.makeIndexRoute(options)

/** Read the stable route path. */
export const path = <Content, ParamsOutput extends Params, SearchOutput extends Search>(
  self: Definition<Content, ParamsOutput, SearchOutput>,
): Path => self.path

/** Read the route content payload. */
export const content = <Content, ParamsOutput extends Params, SearchOutput extends Search>(
  self: Definition<Content, ParamsOutput, SearchOutput>,
): Content => self.content

/** Read the route children. */
export const children = <Content, ParamsOutput extends Params, SearchOutput extends Search>(
  self: Definition<Content, ParamsOutput, SearchOutput>,
): ReadonlyArray<Definition> => self.children
