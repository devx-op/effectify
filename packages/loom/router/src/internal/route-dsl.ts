import * as Decode from "../decode.js"
import * as Fallback from "../fallback.js"
import * as Layout from "../layout.js"
import * as Route from "../route.js"
import { normalizeFallbacks } from "./fallback.js"
import { normalizePathname, tokenizePath } from "./path.js"

export interface RouteDefinition<
  Content = unknown,
  ParamsOutput extends Route.Params = Route.Params,
  SearchOutput extends Route.Search = Route.Search,
> {
  readonly _tag: "LoomRouterRoute"
  readonly kind: "path" | "index"
  readonly path: Route.Path
  readonly content: Content
  readonly segments: ReadonlyArray<string>
  readonly children: ReadonlyArray<Route.Definition>
  readonly decode: {
    readonly params?: Decode.Decoder<Route.Params, ParamsOutput>
    readonly search?: Decode.Decoder<Route.Search, SearchOutput>
  }
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
>(options: {
  readonly kind: RouteDefinition["kind"]
  readonly path: Route.Path
  readonly segments: ReadonlyArray<string>
  readonly content: Content
  readonly decode: Route.DecodeOptions<ParamsOutput, SearchOutput> | undefined
  readonly children: ReadonlyArray<Route.Definition>
  readonly layout: Layout.Definition | undefined
  readonly fallback: Fallback.Config | undefined
}): RouteDefinition<Content, ParamsOutput, SearchOutput> => {
  validateSegments(options.segments)

  return {
    _tag: "LoomRouterRoute",
    kind: options.kind,
    path: options.path,
    content: options.content,
    segments: options.segments,
    children: options.children,
    decode: {
      params: options.decode?.params === undefined ? undefined : Decode.toDecoder(options.decode.params),
      search: options.decode?.search === undefined ? undefined : Decode.toDecoder(options.decode.search),
    },
    layout: options.layout,
    fallback: normalizeFallbacks(options.fallback),
  }
}

export const makeRoute = <
  Content,
  ParamsOutput extends Route.Params = Route.Params,
  SearchOutput extends Route.Search = Route.Search,
>(
  options: Route.Options<Content, ParamsOutput, SearchOutput>,
): RouteDefinition<Content, ParamsOutput, SearchOutput> => {
  const path = normalizePathname(options.path)

  return createRoute({
    kind: "path",
    path,
    content: options.content,
    segments: tokenizePath(path),
    decode: options.decode,
    children: options.children ?? [],
    layout: options.layout,
    fallback: options.fallback,
  })
}

export const makeChildRoute = <
  Content,
  ParamsOutput extends Route.Params = Route.Params,
  SearchOutput extends Route.Search = Route.Search,
>(
  options: Route.ChildOptions<Content, ParamsOutput, SearchOutput>,
): RouteDefinition<Content, ParamsOutput, SearchOutput> => {
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
    path: options.path,
    content: options.content,
    segments: [options.path],
    decode: options.decode,
    children: options.children ?? [],
    layout: options.layout,
    fallback: options.fallback,
  })
}

export const makeIndexRoute = <
  Content,
  ParamsOutput extends Route.Params = Route.Params,
  SearchOutput extends Route.Search = Route.Search,
>(
  options: Route.IndexOptions<Content, ParamsOutput, SearchOutput>,
): RouteDefinition<Content, ParamsOutput, SearchOutput> =>
  createRoute({
    kind: "index",
    path: "",
    content: options.content,
    segments: [],
    decode: options.decode,
    children: options.children ?? [],
    layout: options.layout,
    fallback: options.fallback,
  })
