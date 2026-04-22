import type * as Decode from "./decode.js"
import type * as Fallback from "./fallback.js"
import type * as Layout from "./layout.js"
import type * as Route from "./route.js"

export interface RouteMatch {
  readonly route: Route.AnyDefinition
  readonly pathname: string
  readonly params: Route.Params
}

export interface Success<
  Content = unknown,
  Params extends Route.Params = Route.Params,
  Search extends Route.Search = Route.Search,
> {
  readonly _tag: "LoomRouterMatchSuccess"
  readonly url: URL
  readonly pathname: string
  readonly route: Route.Definition<Content, Params, Search, any, any, any, any>
  readonly params: Params
  readonly search: Search
  readonly layout: Layout.Definition | undefined
  readonly matches: ReadonlyArray<RouteMatch>
}

export interface Miss<Content = unknown> {
  readonly _tag: "LoomRouterMatchMiss"
  readonly url: URL
  readonly pathname: string
  readonly fallback: Fallback.Definition<Content> | undefined
  readonly route: Route.AnyDefinition | undefined
  readonly params: Route.Params
  readonly search: Route.Search
  readonly matches: ReadonlyArray<RouteMatch>
}

export interface DecodeFailure<
  Content = unknown,
  Params extends Route.Params = Route.Params,
  Search extends Route.Search = Route.Search,
> {
  readonly _tag: "LoomRouterMatchDecodeFailure"
  readonly url: URL
  readonly pathname: string
  readonly route: Route.Definition<Content, Params, Search, any, any, any, any>
  readonly params: Route.Params
  readonly search: Route.Search
  readonly issues: ReadonlyArray<Decode.Issue>
  readonly matches: ReadonlyArray<RouteMatch>
}

/** Public router match contract for the initial slice. */
export type Result<
  Content = unknown,
  Params extends Route.Params = Route.Params,
  Search extends Route.Search = Route.Search,
> = Success<Content, Params, Search> | Miss | DecodeFailure<Content, Params, Search>

/** Narrow a router match result to a successful match. */
export const isSuccess = <
  Content = unknown,
  Params extends Route.Params = Route.Params,
  Search extends Route.Search = Route.Search,
>(result: Result<Content, Params, Search>): result is Success<Content, Params, Search> =>
  result._tag === "LoomRouterMatchSuccess"

/** Narrow a router match result to a miss. */
export const isMiss = <
  Content = unknown,
  Params extends Route.Params = Route.Params,
  Search extends Route.Search = Route.Search,
>(result: Result<Content, Params, Search>): result is Miss => result._tag === "LoomRouterMatchMiss"

/** Narrow a router match result to a decode failure. */
export const isDecodeFailure = <
  Content = unknown,
  Params extends Route.Params = Route.Params,
  Search extends Route.Search = Route.Search,
>(result: Result<Content, Params, Search>): result is DecodeFailure<Content, Params, Search> =>
  result._tag === "LoomRouterMatchDecodeFailure"
