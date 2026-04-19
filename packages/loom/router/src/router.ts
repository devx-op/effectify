import type * as Loom from "@effectify/loom"
import { dual } from "effect/Function"
import type * as ServiceMap from "effect/ServiceMap"
import type * as Decode from "./decode.js"
import type * as Fallback from "./fallback.js"
import type * as Layout from "./layout.js"
import type * as Match from "./match.js"
import type * as Route from "./route.js"
import type * as RouteGroup from "./route-group.js"
import { mergeAnnotations } from "./internal/annotations.js"
import { reflectRoutes } from "./internal/reflection.js"
import * as internal from "./internal/router.js"

export interface Options {
  readonly routes: ReadonlyArray<Route.Definition>
  readonly layout?: Layout.Definition
  readonly fallback?: Fallback.Config
}

export interface ReflectOptions {
  readonly predicate?:
    | ((options: { readonly group: RouteGroup.Definition | undefined; readonly route: Route.Definition }) => boolean)
    | undefined
  readonly onGroup?:
    | ((options: {
      readonly group: RouteGroup.Definition
      readonly mergedAnnotations: Route.Annotations
    }) => void)
    | undefined
  readonly onRoute: (options: {
    readonly group: RouteGroup.Definition | undefined
    readonly route: Route.Definition
    readonly path: Route.AbsolutePath
    readonly parents: ReadonlyArray<Route.Definition>
    readonly mergedAnnotations: Route.Annotations
    readonly layouts: ReadonlyArray<Layout.Definition>
    readonly fallback: Fallback.Boundaries
  }) => void
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
  readonly diagnostics: ReadonlyArray<Loom.Diagnostics.Report>
  readonly diagnosticSummary: ReadonlyArray<Loom.Diagnostics.Summary>
}

export interface ResolveNotFound {
  readonly _tag: "LoomRouterResolveNotFound"
  readonly context: Context
  readonly fallback: Fallback.Definition | undefined
  readonly output: Loom.Html.Child | undefined
  readonly diagnostics: ReadonlyArray<Loom.Diagnostics.Report>
  readonly diagnosticSummary: ReadonlyArray<Loom.Diagnostics.Summary>
}

export interface ResolveInvalidInput {
  readonly _tag: "LoomRouterResolveInvalidInput"
  readonly context: Context
  readonly route: Route.Definition | undefined
  readonly issues: ReadonlyArray<Decode.Issue>
  readonly fallback: Fallback.Definition | undefined
  readonly output: Loom.Html.Child | undefined
  readonly diagnostics: ReadonlyArray<Loom.Diagnostics.Report>
  readonly diagnosticSummary: ReadonlyArray<Loom.Diagnostics.Summary>
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

/** Create either a compatibility router or an algebra-first empty router. */
export function make(options: Options): Definition
export function make(identifier: string): Definition
export function make(input: string | Options): Definition {
  return typeof input === "string" ? internal.makeEmptyRouter(input) : internal.makeRouter(input)
}

/** Add a route or route group to a Loom router in data-first or pipeable form. */
export const add: {
  (entry: Route.Definition | RouteGroup.Definition): (self: Definition) => Definition
  (self: Definition, entry: Route.Definition | RouteGroup.Definition): Definition
} = dual(
  2,
  (self: Definition, entry: Route.Definition | RouteGroup.Definition): Definition =>
    internal.addEntryToRouter(self, entry),
)

/** Prefix all routes already known to the router, and future additions. */
export const prefix: {
  (path: Route.AbsolutePath): (self: Definition) => Definition
  (self: Definition, path: Route.AbsolutePath): Definition
} = dual(2, (self: Definition, path: Route.AbsolutePath): Definition => internal.prefixRouter(self, path))

/** Add a single Effect ServiceMap annotation to a router. */
export const annotate: {
  <I, S>(tag: ServiceMap.Key<I, S>, value: S): (self: Definition) => Definition
  <I, S>(self: Definition, tag: ServiceMap.Key<I, S>, value: S): Definition
} = dual(
  3,
  <I, S>(self: Definition, tag: ServiceMap.Key<I, S>, value: S): Definition =>
    internal.annotateRouter(self, tag, value),
)

/** Merge multiple Effect ServiceMap annotations into a router. */
export const annotateMerge: {
  (annotations: Route.Annotations): (self: Definition) => Definition
  (self: Definition, annotations: Route.Annotations): Definition
} = dual(
  2,
  (self: Definition, annotations: Route.Annotations): Definition => internal.annotateRouterMerge(self, annotations),
)

/** Read the stable route list from a router definition. */
export const routes = (self: Definition): ReadonlyArray<Route.Definition> => self.routes

/** Read the grouped route collections stored on a router definition. */
export const groups = (self: Definition): ReadonlyArray<RouteGroup.Definition> => self.groups

/** Reflect the effective route tree and merged annotations. */
export const reflect = (self: Definition, options: ReflectOptions): void => {
  const predicate = options.predicate

  for (const group of self.groups) {
    const mergedAnnotations = mergeAnnotations(self.annotations, group.annotations)
    options.onGroup?.({ group, mergedAnnotations })
  }

  for (const entry of self.entries) {
    if (entry._tag === "LoomRouterRouteGroup") {
      reflectRoutes(entry.routes, {
        group: entry,
        inheritedAnnotations: mergeAnnotations(self.annotations, entry.annotations),
        inheritedFallback: self.fallback,
        inheritedLayouts: self.layout === undefined ? [] : [self.layout],
        predicate: predicate === undefined
          ? undefined
          : (route) => predicate({ group: route.group, route: route.route }),
        onRoute: (route) => {
          options.onRoute({
            group: route.group,
            route: route.route,
            path: route.path,
            parents: route.parents,
            mergedAnnotations: route.mergedAnnotations,
            layouts: route.layouts,
            fallback: route.fallback,
          })
        },
      })
      continue
    }

    reflectRoutes([entry], {
      inheritedAnnotations: self.annotations,
      inheritedFallback: self.fallback,
      inheritedLayouts: self.layout === undefined ? [] : [self.layout],
      predicate: predicate === undefined ? undefined : (route) => predicate({ group: route.group, route: route.route }),
      onRoute: (route) => {
        options.onRoute({
          group: route.group,
          route: route.route,
          path: route.path,
          parents: route.parents,
          mergedAnnotations: route.mergedAnnotations,
          layouts: route.layouts,
          fallback: route.fallback,
        })
      },
    })
  }
}

/** Match the current location against the router's public route surface. */
export const match = (self: Definition, input: string | URL): Match.Result => internal.matchRouter(self, input)

/** Resolve the current location into route context plus a renderable Loom child. */
export const resolve = (self: Definition, input: string | URL): ResolveResult => internal.resolveRouter(self, input)

/** Render the current location through route pages, layouts, and fallbacks. */
export const render = (self: Definition, input: string | URL): Loom.Html.Child | undefined =>
  internal.renderRouter(self, input)
