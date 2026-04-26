import type * as Context from "effect/Context"
import type * as Route from "../route.js"
import { annotateValue, emptyAnnotations, mergeAnnotations } from "./annotations.js"
import { joinPathnames } from "./path.js"
import { prefixRoute } from "./route-dsl.js"

export interface RouteGroupDefinition<
  Routes extends ReadonlyArray<Route.AnyDefinition> = ReadonlyArray<Route.AnyDefinition>,
> {
  readonly _tag: "LoomRouterRouteGroup"
  readonly identifier: string
  readonly routes: Routes
  readonly annotations: Route.Annotations
  readonly pathPrefix: Route.AbsolutePath | undefined
}

const applyPrefix = <CurrentRoute extends Route.AnyDefinition>(
  prefix: Route.AbsolutePath | undefined,
  route: CurrentRoute,
): CurrentRoute => (prefix === undefined ? route : (prefixRoute(route, prefix) as unknown as CurrentRoute))

export const isRouteGroup = (value: unknown): value is RouteGroupDefinition<ReadonlyArray<Route.AnyDefinition>> =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "LoomRouterRouteGroup"

export const makeRouteGroup = (identifier: string): RouteGroupDefinition => ({
  _tag: "LoomRouterRouteGroup",
  identifier,
  routes: [],
  annotations: emptyAnnotations(),
  pathPrefix: undefined,
})

export const addRouteToGroup = <
  Routes extends ReadonlyArray<Route.AnyDefinition>,
  RouteToAdd extends Route.AnyDefinition,
>(
  self: RouteGroupDefinition<Routes>,
  route: RouteToAdd,
): RouteGroupDefinition<[...Routes, RouteToAdd]> => ({
  ...self,
  routes: [...self.routes, applyPrefix(self.pathPrefix, route)],
})

export const prefixRouteGroup = <Routes extends ReadonlyArray<Route.AnyDefinition>>(
  self: RouteGroupDefinition<Routes>,
  prefix: Route.AbsolutePath,
): RouteGroupDefinition<Routes> => ({
  ...self,
  pathPrefix: self.pathPrefix === undefined ? prefix : joinPathnames(self.pathPrefix, prefix),
  routes: self.routes.map((route) => prefixRoute(route, prefix)) as unknown as Routes,
})

export const annotateRouteGroup = <Routes extends ReadonlyArray<Route.AnyDefinition>, I, S>(
  self: RouteGroupDefinition<Routes>,
  tag: Context.Service<I, S>,
  value: S,
): RouteGroupDefinition<Routes> => ({
  ...self,
  annotations: annotateValue(self.annotations, tag, value),
})

export const annotateRouteGroupMerge = <Routes extends ReadonlyArray<Route.AnyDefinition>>(
  self: RouteGroupDefinition<Routes>,
  annotations: Route.Annotations,
): RouteGroupDefinition<Routes> => ({
  ...self,
  annotations: mergeAnnotations(self.annotations, annotations),
})
