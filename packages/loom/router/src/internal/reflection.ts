import type * as Fallback from "../fallback.js"
import type * as Layout from "../layout.js"
import type * as Route from "../route.js"
import type * as RouteGroup from "../route-group.js"
import { mergeAnnotations } from "./annotations.js"
import { normalizePathname } from "./path.js"

const toPathname = (segments: ReadonlyArray<string>): Route.AbsolutePath => {
  if (segments.length === 0) {
    return "/"
  }

  return normalizePathname(`/${segments.join("/")}`)
}

export interface ReflectedRoute {
  readonly route: Route.Definition
  readonly group: RouteGroup.Definition | undefined
  readonly path: Route.AbsolutePath
  readonly parents: ReadonlyArray<Route.Definition>
  readonly mergedAnnotations: Route.Annotations
  readonly layouts: ReadonlyArray<Layout.Definition>
  readonly fallback: Fallback.Boundaries
}

export interface ReflectRoutesOptions {
  readonly group?: RouteGroup.Definition
  readonly inheritedAnnotations: Route.Annotations
  readonly inheritedFallback?: Fallback.Boundaries
  readonly inheritedLayouts?: ReadonlyArray<Layout.Definition>
  readonly parents?: ReadonlyArray<Route.Definition>
  readonly prefixSegments?: ReadonlyArray<string>
  readonly predicate?: ((route: ReflectedRoute) => boolean) | undefined
  readonly onRoute: (route: ReflectedRoute) => void
}

const mergeFallbacks = (
  inherited: Fallback.Boundaries | undefined,
  local: Fallback.Boundaries,
): Fallback.Boundaries => ({
  notFound: local.notFound ?? inherited?.notFound,
  invalidInput: local.invalidInput ?? inherited?.invalidInput,
})

export const reflectRoutes = (
  routes: ReadonlyArray<Route.Definition>,
  options: ReflectRoutesOptions,
): void => {
  const prefixSegments = options.prefixSegments ?? []
  const parents = options.parents ?? []
  const inheritedLayouts = options.inheritedLayouts ?? []

  for (const route of routes) {
    const currentSegments = route.kind === "index"
      ? prefixSegments
      : route.path.startsWith("/")
      ? route.segments
      : [...prefixSegments, ...route.segments]
    const layouts = route.layout === undefined ? inheritedLayouts : [...inheritedLayouts, route.layout]
    const reflectedRoute: ReflectedRoute = {
      route,
      group: options.group,
      path: toPathname(currentSegments),
      parents,
      mergedAnnotations: mergeAnnotations(options.inheritedAnnotations, route.annotations),
      layouts,
      fallback: mergeFallbacks(options.inheritedFallback, route.fallback),
    }

    if (options.predicate?.(reflectedRoute) !== false) {
      options.onRoute(reflectedRoute)
    }

    reflectRoutes(route.children, {
      ...options,
      inheritedAnnotations: reflectedRoute.mergedAnnotations,
      inheritedFallback: reflectedRoute.fallback,
      inheritedLayouts: reflectedRoute.layouts,
      parents: [...parents, route],
      prefixSegments: currentSegments,
    })
  }
}
