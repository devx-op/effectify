import type * as Loom from "@effectify/loom"
import type * as Decode from "./decode.js"
import type * as Fallback from "./fallback.js"
import type * as Layout from "./layout.js"
import type * as Match from "./match.js"
import type * as Route from "./route.js"
import * as internal from "./internal/router.js"

export interface Options {
  readonly routes: ReadonlyArray<Route.Definition>
  readonly layout?: Layout.Definition
  readonly fallback?: Fallback.Config
}

export interface Context<Params extends Route.Params = Route.Params, Query extends Route.Search = Route.Search> {
  readonly url: URL
  readonly pathname: string
  readonly params: Params
  readonly query: Query
  readonly matches: ReadonlyArray<Match.RouteMatch>
}

export interface InvalidInputContext {
  readonly context: Context
  readonly issues: ReadonlyArray<Decode.Issue>
}

export interface ResolveSuccess<Params extends Route.Params = Route.Params, Query extends Route.Search = Route.Search> {
  readonly _tag: "LoomRouterResolveSuccess"
  readonly context: Context<Params, Query>
  readonly route: Route.Definition<unknown, Params, Query>
  readonly output: Loom.Html.Child
}

export interface ResolveNotFound {
  readonly _tag: "LoomRouterResolveNotFound"
  readonly context: Context
  readonly fallback: Fallback.Definition | undefined
  readonly output: Loom.Html.Child | undefined
}

export interface ResolveInvalidInput {
  readonly _tag: "LoomRouterResolveInvalidInput"
  readonly context: Context
  readonly route: Route.Definition | undefined
  readonly issues: ReadonlyArray<Decode.Issue>
  readonly fallback: Fallback.Definition | undefined
  readonly output: Loom.Html.Child | undefined
}

export type ResolveResult = ResolveSuccess | ResolveNotFound | ResolveInvalidInput

/** Narrow a router resolve result to a matched route. */
export const isResolveSuccess = (result: ResolveResult): result is ResolveSuccess =>
  result._tag === "LoomRouterResolveSuccess"

/** Narrow a router resolve result to a not-found fallback render. */
export const isResolveNotFound = (result: ResolveResult): result is ResolveNotFound =>
  result._tag === "LoomRouterResolveNotFound"

/** Narrow a router resolve result to an invalid-input fallback render. */
export const isResolveInvalidInput = (result: ResolveResult): result is ResolveInvalidInput =>
  result._tag === "LoomRouterResolveInvalidInput"

/** Public router definition for the initial Loom router slice. */
export type Definition = internal.RouterDefinition

/** Create a Loom router from route, layout, and fallback boundaries. */
export const make = (options: Options): Definition => internal.makeRouter(options)

/** Read the stable route list from a router definition. */
export const routes = (self: Definition): ReadonlyArray<Route.Definition> => self.routes

/** Match the current location against the router's public route surface. */
export const match = (self: Definition, input: string | URL): Match.Result => internal.matchRouter(self, input)

/** Resolve the current location into route context plus a renderable Loom child. */
export const resolve = (self: Definition, input: string | URL): ResolveResult => internal.resolveRouter(self, input)

/** Render the current location through route pages, layouts, and fallbacks. */
export const render = (self: Definition, input: string | URL): Loom.Html.Child | undefined =>
  internal.renderRouter(self, input)
