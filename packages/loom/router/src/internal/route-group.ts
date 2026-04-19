import type * as ServiceMap from "effect/ServiceMap"
import type * as Route from "../route.js"
import { annotateValue, emptyAnnotations, mergeAnnotations } from "./annotations.js"
import { joinPathnames } from "./path.js"
import { prefixRoute } from "./route-dsl.js"

export interface RouteGroupDefinition {
  readonly _tag: "LoomRouterRouteGroup"
  readonly identifier: string
  readonly routes: ReadonlyArray<Route.Definition>
  readonly annotations: Route.Annotations
  readonly pathPrefix: Route.AbsolutePath | undefined
}

const applyPrefix = (prefix: Route.AbsolutePath | undefined, route: Route.Definition): Route.Definition =>
  prefix === undefined ? route : prefixRoute(route, prefix)

export const isRouteGroup = (value: unknown): value is RouteGroupDefinition =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "LoomRouterRouteGroup"

export const makeRouteGroup = (identifier: string): RouteGroupDefinition => ({
  _tag: "LoomRouterRouteGroup",
  identifier,
  routes: [],
  annotations: emptyAnnotations(),
  pathPrefix: undefined,
})

export const addRouteToGroup = (self: RouteGroupDefinition, route: Route.Definition): RouteGroupDefinition => ({
  ...self,
  routes: [...self.routes, applyPrefix(self.pathPrefix, route)],
})

export const prefixRouteGroup = (self: RouteGroupDefinition, prefix: Route.AbsolutePath): RouteGroupDefinition => ({
  ...self,
  pathPrefix: self.pathPrefix === undefined ? prefix : joinPathnames(self.pathPrefix, prefix),
  routes: self.routes.map((route) => prefixRoute(route, prefix)),
})

export const annotateRouteGroup = <I, S>(
  self: RouteGroupDefinition,
  tag: ServiceMap.Key<I, S>,
  value: S,
): RouteGroupDefinition => ({
  ...self,
  annotations: annotateValue(self.annotations, tag, value),
})

export const annotateRouteGroupMerge = (
  self: RouteGroupDefinition,
  annotations: Route.Annotations,
): RouteGroupDefinition => ({
  ...self,
  annotations: mergeAnnotations(self.annotations, annotations),
})
