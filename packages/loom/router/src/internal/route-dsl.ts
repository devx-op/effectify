import type * as ServiceMap from "effect/ServiceMap"
import * as Decode from "../decode.js"
import * as Fallback from "../fallback.js"
import * as Layout from "../layout.js"
import * as Route from "../route.js"
import type { Annotations } from "./annotations.js"
import { annotateValue, emptyAnnotations, mergeAnnotations } from "./annotations.js"
import { normalizeFallbacks } from "./fallback.js"
import { joinPathnames, normalizePathname, tokenizePath } from "./path.js"

export interface RouteDefinition<
  Content = unknown,
  ParamsOutput extends Route.Params = Route.Params,
  SearchOutput extends Route.Search = Route.Search,
  Identifier extends string | undefined = undefined,
  Children extends ReadonlyArray<Route.AnyDefinition> = readonly [],
> {
  readonly _tag: "LoomRouterRoute"
  readonly kind: "path" | "index"
  readonly identifier: Identifier
  readonly path: Route.Path
  readonly content: Content
  readonly segments: ReadonlyArray<string>
  readonly children: Children
  readonly decode: {
    readonly params?: Decode.Decoder<Route.Params, ParamsOutput>
    readonly search?: Decode.Decoder<Route.Search, SearchOutput>
  }
  readonly annotations: Annotations
  readonly layout: Layout.Definition | undefined
  readonly fallback: Fallback.Boundaries
}

const validateSegments = (segments: ReadonlyArray<string>): void => {
  for (const segment of segments) {
    if (segment.includes("*")) {
      throw new Route.UnsupportedPathError("Wildcard path segments are not supported in the initial router slice")
    }

    if (segment === ":") {
      throw new Route.UnsupportedPathError("Param path segments must include a name")
    }
  }
}

const createRoute = <
  Content,
  ParamsOutput extends Route.Params = Route.Params,
  SearchOutput extends Route.Search = Route.Search,
  Identifier extends string | undefined = undefined,
  Children extends ReadonlyArray<Route.AnyDefinition> = readonly [],
>(options: {
  readonly kind: RouteDefinition["kind"]
  readonly identifier: Identifier
  readonly path: Route.Path
  readonly segments: ReadonlyArray<string>
  readonly content: Content
  readonly decode: Route.DecodeOptions<ParamsOutput, SearchOutput> | undefined
  readonly children: Children
  readonly layout: Layout.Definition | undefined
  readonly fallback: Fallback.Config | undefined
}): RouteDefinition<Content, ParamsOutput, SearchOutput, Identifier, Children> => {
  validateSegments(options.segments)

  return {
    _tag: "LoomRouterRoute",
    kind: options.kind,
    identifier: options.identifier,
    path: options.path,
    content: options.content,
    segments: options.segments,
    children: options.children,
    decode: {
      params: options.decode?.params === undefined ? undefined : Decode.toDecoder(options.decode.params),
      search: options.decode?.search === undefined ? undefined : Decode.toDecoder(options.decode.search),
    },
    annotations: emptyAnnotations(),
    layout: options.layout,
    fallback: normalizeFallbacks(options.fallback),
  }
}

export const makeRoute = <
  Content,
  ParamsOutput extends Route.Params = Route.Params,
  SearchOutput extends Route.Search = Route.Search,
  Children extends ReadonlyArray<Route.AnyDefinition> = readonly [],
>(
  options: Route.Options<Content, ParamsOutput, SearchOutput, string | undefined, Children>,
): RouteDefinition<Content, ParamsOutput, SearchOutput, string | undefined, Children> => {
  const path = normalizePathname(options.path)

  return createRoute({
    kind: "path",
    identifier: options.identifier,
    path,
    content: options.content,
    segments: tokenizePath(path),
    decode: options.decode,
    children: options.children ?? ([] as unknown as Children),
    layout: options.layout,
    fallback: options.fallback,
  })
}

export const makeChildRoute = <
  Content,
  ParamsOutput extends Route.Params = Route.Params,
  SearchOutput extends Route.Search = Route.Search,
  Children extends ReadonlyArray<Route.AnyDefinition> = readonly [],
>(
  options: Route.ChildOptions<Content, ParamsOutput, SearchOutput, string | undefined, Children>,
): RouteDefinition<Content, ParamsOutput, SearchOutput, string | undefined, Children> => {
  if (options.path.length === 0) {
    throw new Route.UnsupportedPathError("Child routes must declare a non-empty path; use Route.index(...) instead")
  }

  if (options.path.startsWith("/")) {
    throw new Route.UnsupportedPathError("Child route paths must be relative segments without a leading slash")
  }

  if (options.path.includes("/")) {
    throw new Route.UnsupportedPathError(
      "Nested child paths must use route children instead of slash-delimited relative paths",
    )
  }

  return createRoute({
    kind: "path",
    identifier: options.identifier,
    path: options.path,
    content: options.content,
    segments: [options.path],
    decode: options.decode,
    children: options.children ?? ([] as unknown as Children),
    layout: options.layout,
    fallback: options.fallback,
  })
}

export const makeIndexRoute = <
  Content,
  ParamsOutput extends Route.Params = Route.Params,
  SearchOutput extends Route.Search = Route.Search,
  Children extends ReadonlyArray<Route.AnyDefinition> = readonly [],
>(
  options: Route.IndexOptions<Content, ParamsOutput, SearchOutput, string | undefined, Children>,
): RouteDefinition<Content, ParamsOutput, SearchOutput, string | undefined, Children> =>
  createRoute({
    kind: "index",
    identifier: options.identifier,
    path: "",
    content: options.content,
    segments: [],
    decode: options.decode,
    children: options.children ?? ([] as unknown as Children),
    layout: options.layout,
    fallback: options.fallback,
  })

const prefixChildren = <Children extends ReadonlyArray<Route.AnyDefinition>>(
  children: Children,
  prefix: Route.AbsolutePath,
): Children => children.map((child) => prefixRoute(child, prefix)) as unknown as Children

export const prefixRoute = <
  Content,
  ParamsOutput extends Route.Params,
  SearchOutput extends Route.Search,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<Route.AnyDefinition>,
>(
  self: RouteDefinition<Content, ParamsOutput, SearchOutput, Identifier, Children>,
  prefix: Route.AbsolutePath,
): RouteDefinition<Content, ParamsOutput, SearchOutput, Identifier, Children> => {
  const nextPath = self.kind === "path" && self.path.startsWith("/") ? joinPathnames(prefix, self.path) : self.path

  return {
    ...self,
    path: nextPath,
    segments: nextPath.startsWith("/") ? tokenizePath(nextPath) : self.segments,
    children: prefixChildren(self.children, prefix),
  }
}

export const annotateRoute = <
  Content,
  ParamsOutput extends Route.Params,
  SearchOutput extends Route.Search,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<Route.AnyDefinition>,
  I,
  S,
>(
  self: RouteDefinition<Content, ParamsOutput, SearchOutput, Identifier, Children>,
  tag: ServiceMap.Key<I, S>,
  value: S,
): RouteDefinition<Content, ParamsOutput, SearchOutput, Identifier, Children> => ({
  ...self,
  annotations: annotateValue(self.annotations, tag, value),
})

export const annotateRouteMerge = <
  Content,
  ParamsOutput extends Route.Params,
  SearchOutput extends Route.Search,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<Route.AnyDefinition>,
>(
  self: RouteDefinition<Content, ParamsOutput, SearchOutput, Identifier, Children>,
  annotations: Route.Annotations,
): RouteDefinition<Content, ParamsOutput, SearchOutput, Identifier, Children> => ({
  ...self,
  annotations: mergeAnnotations(self.annotations, annotations),
})
