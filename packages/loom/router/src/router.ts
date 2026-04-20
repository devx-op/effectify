import type * as Loom from "@effectify/loom"
import { dual } from "effect/Function"
import type * as ServiceMap from "effect/ServiceMap"
import type * as Decode from "./decode.js"
import type * as Fallback from "./fallback.js"
import type * as Layout from "./layout.js"
import type * as Match from "./match.js"
import type * as Renderable from "./renderable.js"
import type * as Route from "./route.js"
import type * as RouteGroup from "./route-group.js"
import { mergeAnnotations } from "./internal/annotations.js"
import { reflectRoutes } from "./internal/reflection.js"
import * as internal from "./internal/router.js"

type KnownRoute = Route.Definition<any, any, any, any, any>

export interface Options<Routes extends ReadonlyArray<KnownRoute> = ReadonlyArray<KnownRoute>> {
  readonly routes: Routes
  readonly layout?: Layout.Definition
  readonly fallback?: Fallback.Config
}

type RouterEntry = KnownRoute | RouteGroup.Definition<any>

type ChildRoutes<Self> = Self extends Route.Definition<any, any, any, any, infer Children> ? Children[number] : never

type GrandchildRoutes<Self> = ChildRoutes<ChildRoutes<Self>>

type RoutesFromRoute<Self> = Self | ChildRoutes<Self> | GrandchildRoutes<Self>

type RoutesFromEntry<Entry> = Entry extends RouteGroup.Definition<infer GroupRoutes>
  ? GroupRoutes[number] extends infer GroupRoute ? GroupRoute extends KnownRoute ? RoutesFromRoute<GroupRoute>
    : never
  : never
  : Entry extends KnownRoute ? RoutesFromRoute<Entry>
  : never

type IdentifierFromRoutes<Routes> = Routes extends Route.Definition<any, any, any, infer Identifier, any>
  ? Exclude<Identifier, undefined>
  : never

type ResolveTargetRoute<Self extends Definition<any>, Target> = Target extends string
  ? Extract<RoutesOf<Self>, Route.Definition<any, any, any, Target, any>>
  : Target extends RoutesOf<Self> ? Target
  : never

export type RoutesOfEntries<Entries extends ReadonlyArray<RouterEntry>> = RoutesFromEntry<Entries[number]>

export type RoutesOf<Self extends Definition<any>> = Self extends { readonly __entries?: infer Entries }
  ? Entries extends ReadonlyArray<RouterEntry> ? RoutesOfEntries<Entries>
  : never
  : never

export type IdentifiersOf<Self extends Definition<any>> = IdentifierFromRoutes<RoutesOf<Self>>

export type HrefOptionsFor<Self extends Definition<any>, Target> = [ResolveTargetRoute<Self, Target>] extends [never]
  ? never
  : ResolveTargetRoute<Self, Target> extends Route.Definition<any, infer Params, infer Search, any, any>
    ? Route.HrefOptions<Params, Search>
  : never

export interface ReflectOptions {
  readonly predicate?:
    | ((
      options: {
        readonly group: RouteGroup.Definition | undefined
        readonly route: Route.Definition<any, any, any, any, any>
      },
    ) => boolean)
    | undefined
  readonly onGroup?:
    | ((options: {
      readonly group: RouteGroup.Definition
      readonly mergedAnnotations: Route.Annotations
    }) => void)
    | undefined
  readonly onRoute: (options: {
    readonly group: RouteGroup.Definition | undefined
    readonly route: Route.Definition<any, any, any, any, any>
    readonly path: Route.AbsolutePath
    readonly parents: ReadonlyArray<Route.Definition<any, any, any, any, any>>
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
  readonly route: Route.Definition<unknown, Params, Query, any, any>
  readonly output: Renderable.Type
  readonly diagnostics: ReadonlyArray<Loom.Diagnostics.Report>
  readonly diagnosticSummary: ReadonlyArray<Loom.Diagnostics.Summary>
}

export interface ResolveNotFound {
  readonly _tag: "LoomRouterResolveNotFound"
  readonly context: Context
  readonly fallback: Fallback.Definition | undefined
  readonly output: Renderable.Type | undefined
  readonly diagnostics: ReadonlyArray<Loom.Diagnostics.Report>
  readonly diagnosticSummary: ReadonlyArray<Loom.Diagnostics.Summary>
}

export interface ResolveInvalidInput {
  readonly _tag: "LoomRouterResolveInvalidInput"
  readonly context: Context
  readonly route: Route.Definition<any, any, any, any, any> | undefined
  readonly issues: ReadonlyArray<Decode.Issue>
  readonly fallback: Fallback.Definition | undefined
  readonly output: Renderable.Type | undefined
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
export type Definition<Entries extends ReadonlyArray<RouterEntry> = ReadonlyArray<RouterEntry>> =
  & Omit<
    internal.RouterDefinition<Entries>,
    never
  >
  & {
    readonly __entries?: Entries
  }

export type HrefResolutionError = internal.HrefResolutionError
export const HrefResolutionError = internal.HrefResolutionError

/** Create either a compatibility router or an algebra-first empty router. */
export function make<Routes extends ReadonlyArray<KnownRoute>>(options: Options<Routes>): Definition<Routes>
export function make(identifier: string): Definition
export function make(input: string | Options): Definition {
  return (typeof input === "string" ? internal.makeEmptyRouter(input) : internal.makeRouter(input)) as Definition
}

/** Add a route or route group to a Loom router in data-first or pipeable form. */
export const add: {
  <Entry extends RouterEntry>(entry: Entry): <Entries extends ReadonlyArray<RouterEntry>>(
    self: Definition<Entries>,
  ) => Definition<[...Entries, Entry]>
  <Entries extends ReadonlyArray<RouterEntry>, Entry extends RouterEntry>(
    self: Definition<Entries>,
    entry: Entry,
  ): Definition<[
    ...Entries,
    Entry,
  ]>
} = dual(2, internal.addEntryToRouter)

/** Prefix all routes already known to the router, and future additions. */
export const prefix: {
  (
    path: Route.AbsolutePath,
  ): <Entries extends ReadonlyArray<RouterEntry>>(self: Definition<Entries>) => Definition<Entries>
  <Entries extends ReadonlyArray<RouterEntry>>(self: Definition<Entries>, path: Route.AbsolutePath): Definition<Entries>
} = dual(2, internal.prefixRouter)

/** Add a single Effect ServiceMap annotation to a router. */
export const annotate: {
  <I, S>(tag: ServiceMap.Key<I, S>, value: S): <Entries extends ReadonlyArray<RouterEntry>>(
    self: Definition<Entries>,
  ) => Definition<Entries>
  <Entries extends ReadonlyArray<RouterEntry>, I, S>(
    self: Definition<Entries>,
    tag: ServiceMap.Key<I, S>,
    value: S,
  ): Definition<Entries>
} = dual(3, internal.annotateRouter)

/** Merge multiple Effect ServiceMap annotations into a router. */
export const annotateMerge: {
  (
    annotations: Route.Annotations,
  ): <Entries extends ReadonlyArray<RouterEntry>>(self: Definition<Entries>) => Definition<Entries>
  <Entries extends ReadonlyArray<RouterEntry>>(
    self: Definition<Entries>,
    annotations: Route.Annotations,
  ): Definition<Entries>
} = dual(2, internal.annotateRouterMerge)

/** Read the stable route list from a router definition. */
export const routes = <Entries extends ReadonlyArray<RouterEntry>>(
  self: Definition<Entries>,
): ReadonlyArray<RoutesOfEntries<Entries>> => self.routes as ReadonlyArray<RoutesOfEntries<Entries>>

/** Read the grouped route collections stored on a router definition. */
export const groups = <Entries extends ReadonlyArray<RouterEntry>>(
  self: Definition<Entries>,
): ReadonlyArray<Extract<Entries[number], RouteGroup.Definition<any>>> =>
  self.groups as ReadonlyArray<Extract<Entries[number], RouteGroup.Definition<any>>>

/** Look up a route by its optional stable identifier. */
export const find = <Entries extends ReadonlyArray<RouterEntry>, Identifier extends string>(
  self: Definition<Entries>,
  identifier: Identifier,
): Extract<RoutesOf<Definition<Entries>>, Route.Definition<any, any, any, Identifier, any>> | undefined =>
  internal.findRouteByIdentifier(self, identifier) as
    | Extract<RoutesOf<Definition<Entries>>, Route.Definition<any, any, any, Identifier, any>>
    | undefined

/** Resolve an effective absolute path for a concrete route or route identifier. */
export const pathFor = <Entries extends ReadonlyArray<RouterEntry>>(
  self: Definition<Entries>,
  target: RoutesOfEntries<Entries> | string,
): Route.AbsolutePath | undefined => internal.resolveRoutePath(self, target)

/** Build an href using the router's reflected absolute paths and typed route contract. */
export function href<Entries extends ReadonlyArray<RouterEntry>, Target extends RoutesOfEntries<Entries>>(
  self: Definition<Entries>,
  target: Target,
  options?: Route.HrefOptions<Route.ParamsOf<Target>, Route.SearchOf<Target>>,
  base?: string | URL,
): string
export function href<
  Entries extends ReadonlyArray<RouterEntry>,
  Target extends IdentifierFromRoutes<RoutesOfEntries<Entries>>,
>(
  self: Definition<Entries>,
  target: Target,
  options?: HrefOptionsFor<Definition<Entries>, Target>,
  base?: string | URL,
): string
export function href(
  self: Definition<ReadonlyArray<RouterEntry>>,
  target: Route.AnyDefinition | string,
  options?: Route.HrefOptions,
  base?: string | URL,
): string {
  return internal.buildRouteHref(self, target, options, base)
}

/** Reflect the effective route tree and merged annotations. */
export const reflect = <Entries extends ReadonlyArray<RouterEntry>>(
  self: Definition<Entries>,
  options: ReflectOptions,
): void => {
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
export const match = <Entries extends ReadonlyArray<RouterEntry>>(
  self: Definition<Entries>,
  input: string | URL,
): Match.Result => internal.matchRouter(self, input)

/** Resolve the current location into route context plus a renderable Loom child. */
export const resolve = <Entries extends ReadonlyArray<RouterEntry>>(
  self: Definition<Entries>,
  input: string | URL,
): ResolveResult => internal.resolveRouter(self, input)

/** Render the current location through route pages, layouts, and fallbacks. */
export const render = <Entries extends ReadonlyArray<RouterEntry>>(
  self: Definition<Entries>,
  input: string | URL,
): Renderable.Type | undefined => internal.renderRouter(self, input)
