import { dual } from "effect/Function"
import type * as ServiceMap from "effect/ServiceMap"
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
export type Definition = internal.RouteGroupDefinition

export interface ReflectOptions {
  readonly predicate?:
    | ((options: { readonly group: Definition; readonly route: Route.Definition }) => boolean)
    | undefined
  readonly onRoute: (options: {
    readonly group: Definition
    readonly route: Route.Definition
    readonly path: Route.AbsolutePath
    readonly parents: ReadonlyArray<Route.Definition>
    readonly mergedAnnotations: Annotations
    readonly layouts: ReadonlyArray<Layout.Definition>
    readonly fallback: Fallback.Boundaries
  }) => void
}

/** Create a route group for the Loom router algebra. */
export const make = (identifier: string): Definition => internal.makeRouteGroup(identifier)

/** Add a route to a route group in data-first or pipeable form. */
export const add: {
  (route: Route.Definition): (self: Definition) => Definition
  (self: Definition, route: Route.Definition): Definition
} = dual(2, (self: Definition, route: Route.Definition): Definition => internal.addRouteToGroup(self, route))

/** Prefix every route already contained in the group, and future routes added to it. */
export const prefix: {
  (path: Route.AbsolutePath): (self: Definition) => Definition
  (self: Definition, path: Route.AbsolutePath): Definition
} = dual(2, (self: Definition, path: Route.AbsolutePath): Definition => internal.prefixRouteGroup(self, path))

/** Add a single Effect ServiceMap annotation to a route group. */
export const annotate: {
  <I, S>(tag: ServiceMap.Key<I, S>, value: S): (self: Definition) => Definition
  <I, S>(self: Definition, tag: ServiceMap.Key<I, S>, value: S): Definition
} = dual(
  3,
  <I, S>(self: Definition, tag: ServiceMap.Key<I, S>, value: S): Definition =>
    internal.annotateRouteGroup(self, tag, value),
)

/** Merge multiple Effect ServiceMap annotations into a route group. */
export const annotateMerge: {
  (annotations: Annotations): (self: Definition) => Definition
  (self: Definition, annotations: Annotations): Definition
} = dual(
  2,
  (self: Definition, annotations: Annotations): Definition => internal.annotateRouteGroupMerge(self, annotations),
)

/** Read the stable route list stored in a group. */
export const routes = (self: Definition): ReadonlyArray<Route.Definition> => self.routes

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
