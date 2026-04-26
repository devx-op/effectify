import { dual } from "effect/Function"
import type * as Context from "effect/Context"
import type * as Fallback from "./fallback.js"
import type * as Layout from "./layout.js"
import { reflectRoutes } from "./internal/reflection.js"
import * as internal from "./internal/route-group.js"
import type * as Route from "./route.js"

/** Route-group level metadata carried through router reflection. */
export type Annotations = Route.Annotations

/** Cohesive route collection for Loom's router algebra.
 *
 * In the current slice, groups carry prefixes and annotations only.
 * Layout and fallback inheritance stays on concrete route nodes and is
 * surfaced through reflection/resolution rather than a group-local API.
 */
export type Definition<Routes extends ReadonlyArray<Route.AnyDefinition> = ReadonlyArray<Route.AnyDefinition>> =
  internal.RouteGroupDefinition<Routes>

export interface ReflectOptions {
  readonly predicate?:
    | ((options: { readonly group: Definition; readonly route: Route.Definition<any, any, any, any, any> }) => boolean)
    | undefined
  readonly onRoute: (options: {
    readonly group: Definition
    readonly route: Route.Definition<any, any, any, any, any>
    readonly path: Route.AbsolutePath
    readonly parents: ReadonlyArray<Route.Definition<any, any, any, any, any>>
    readonly mergedAnnotations: Annotations
    readonly layouts: ReadonlyArray<Layout.Definition>
    readonly fallback: Fallback.Boundaries
  }) => void
}

/** Create a route group for the Loom router algebra. */
export const make = (identifier: string): Definition => internal.makeRouteGroup(identifier)

/** Add a route to a route group in data-first or pipeable form. */
export const add: {
  <RouteToAdd extends Route.AnyDefinition>(route: RouteToAdd): <Routes extends ReadonlyArray<Route.AnyDefinition>>(
    self: Definition<Routes>,
  ) => Definition<[...Routes, RouteToAdd]>
  <Routes extends ReadonlyArray<Route.AnyDefinition>, RouteToAdd extends Route.AnyDefinition>(
    self: Definition<Routes>,
    route: RouteToAdd,
  ): Definition<[...Routes, RouteToAdd]>
} = dual(2, internal.addRouteToGroup)

/** Prefix every route already contained in the group, and future routes added to it. */
export const prefix: {
  (
    path: Route.AbsolutePath,
  ): <Routes extends ReadonlyArray<Route.AnyDefinition>>(self: Definition<Routes>) => Definition<Routes>
  <Routes extends ReadonlyArray<Route.AnyDefinition>>(
    self: Definition<Routes>,
    path: Route.AbsolutePath,
  ): Definition<Routes>
} = dual(2, internal.prefixRouteGroup)

/** Add a single Effect Context annotation to a route group. */
export const annotate: {
  <I, S>(tag: Context.Service<I, S>, value: S): <Routes extends ReadonlyArray<Route.AnyDefinition>>(
    self: Definition<Routes>,
  ) => Definition<Routes>
  <Routes extends ReadonlyArray<Route.AnyDefinition>, I, S>(
    self: Definition<Routes>,
    tag: Context.Service<I, S>,
    value: S,
  ): Definition<Routes>
} = dual(3, internal.annotateRouteGroup)

/** Merge multiple Effect Context annotations into a route group. */
export const annotateMerge: {
  (
    annotations: Annotations,
  ): <Routes extends ReadonlyArray<Route.AnyDefinition>>(self: Definition<Routes>) => Definition<Routes>
  <Routes extends ReadonlyArray<Route.AnyDefinition>>(
    self: Definition<Routes>,
    annotations: Annotations,
  ): Definition<Routes>
} = dual(2, internal.annotateRouteGroupMerge)

/** Read the stable route list stored in a group. */
export const routes = <Routes extends ReadonlyArray<Route.AnyDefinition>>(self: Definition<Routes>): Routes =>
  self.routes

/** Reflect over the effective grouped routes and their merged annotations. */
export const reflect = (self: Definition, options: ReflectOptions): void => {
  const predicate = options.predicate

  reflectRoutes(self.routes, {
    group: self,
    inheritedAnnotations: self.annotations,
    inheritedFallback: {},
    inheritedLayouts: [],
    predicate: predicate === undefined
      ? undefined
      : (route) => route.group === undefined ? false : predicate({ group: route.group, route: route.route }),
    onRoute: (route) => {
      if (route.group === undefined) {
        return
      }

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
