import { dual } from "effect/Function"
import type * as ServiceMap from "effect/ServiceMap"
import type * as Decode from "./decode.js"
import type * as Fallback from "./fallback.js"
import type * as Layout from "./layout.js"
import type { Annotations } from "./internal/annotations.js"
import { emptyAnnotations, getAnnotation as getAnnotationValue } from "./internal/annotations.js"
import { buildUrl, normalizePathname } from "./internal/path.js"
import { reflectRoutes } from "./internal/reflection.js"
import * as internal from "./internal/route-dsl.js"

export type AbsolutePath = "/" | `/${string}`

export type RelativePath = string

export type Path = AbsolutePath | RelativePath | ""

export type Params = Readonly<Record<string, string>>

export type SearchValue = string | ReadonlyArray<string>

export type Search = Readonly<Record<string, SearchValue>>

export type { Annotations } from "./internal/annotations.js"

export interface DecodeOptions<ParamsOutput extends Params = Params, SearchOutput extends Search = Search> {
  readonly params?: Decode.DecoderLike<Params, ParamsOutput>
  readonly search?: Decode.DecoderLike<Search, SearchOutput>
}

interface CommonOptions<Content, ParamsOutput extends Params, SearchOutput extends Search> {
  readonly content: Content
  readonly decode?: DecodeOptions<ParamsOutput, SearchOutput>
  readonly children?: ReadonlyArray<Definition>
  readonly layout?: Layout.Definition
  readonly fallback?: Fallback.Config
}

export interface Options<Content = unknown, ParamsOutput extends Params = Params, SearchOutput extends Search = Search>
  extends CommonOptions<Content, ParamsOutput, SearchOutput>
{
  readonly path: AbsolutePath
}

export interface ChildOptions<
  Content = unknown,
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
> extends CommonOptions<Content, ParamsOutput, SearchOutput> {
  readonly path: RelativePath
}

export interface IndexOptions<
  Content = unknown,
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
> extends CommonOptions<Content, ParamsOutput, SearchOutput> {}

export class UnsupportedPathError extends Error {
  readonly _tag = "LoomRouterUnsupportedPathError"

  constructor(message: string) {
    super(message)
    this.name = "UnsupportedPathError"
  }
}

/** Public route definition contract for the initial router DSL. */
export type Definition<Content = unknown, ParamsOutput extends Params = Params, SearchOutput extends Search = Search> =
  internal.RouteDefinition<Content, ParamsOutput, SearchOutput>

export interface ReflectOptions {
  readonly predicate?: ((options: { readonly route: Definition; readonly path: AbsolutePath }) => boolean) | undefined
  readonly onRoute: (options: {
    readonly route: Definition
    readonly path: AbsolutePath
    readonly parents: ReadonlyArray<Definition>
    readonly mergedAnnotations: Annotations
    readonly layouts: ReadonlyArray<Layout.Definition>
    readonly fallback: Fallback.Boundaries
  }) => void
}

export interface HrefOptions<ParamsOutput extends Params = Params, SearchOutput extends Search = Search> {
  readonly params?: ParamsOutput
  readonly query?: SearchOutput
  readonly hash?: string
}

/** Extract the content type stored on a route definition. */
export type Content<Self extends Definition<any, any, any>> = Self extends Definition<infer Value, any, any> ? Value
  : never

/** Extract the decoded params type stored on a route definition. */
export type ParamsOf<Self extends Definition<any, any, any>> = Self extends Definition<any, infer Value, any> ? Value
  : never

/** Extract the decoded search type stored on a route definition. */
export type SearchOf<Self extends Definition<any, any, any>> = Self extends Definition<any, any, infer Value> ? Value
  : never

/** Create a route definition for the initial Loom router DSL. */
export const make = <Content, ParamsOutput extends Params = Params, SearchOutput extends Search = Search>(
  options: Options<Content, ParamsOutput, SearchOutput>,
): Definition<Content, ParamsOutput, SearchOutput> => internal.makeRoute(options)

/** Create a nested child route that contributes a single relative path segment. */
export const child = <Content, ParamsOutput extends Params = Params, SearchOutput extends Search = Search>(
  options: ChildOptions<Content, ParamsOutput, SearchOutput>,
): Definition<Content, ParamsOutput, SearchOutput> => internal.makeChildRoute(options)

/** Create an index child route that matches the parent path exactly. */
export const index = <Content, ParamsOutput extends Params = Params, SearchOutput extends Search = Search>(
  options: IndexOptions<Content, ParamsOutput, SearchOutput>,
): Definition<Content, ParamsOutput, SearchOutput> => internal.makeIndexRoute(options)

/** Prefix a route tree with an absolute pathname. */
export const prefix: {
  (path: AbsolutePath): <Content, ParamsOutput extends Params, SearchOutput extends Search>(
    self: Definition<Content, ParamsOutput, SearchOutput>,
  ) => Definition<Content, ParamsOutput, SearchOutput>
  <Content, ParamsOutput extends Params, SearchOutput extends Search>(
    self: Definition<Content, ParamsOutput, SearchOutput>,
    path: AbsolutePath,
  ): Definition<Content, ParamsOutput, SearchOutput>
} = dual(2, <Content, ParamsOutput extends Params, SearchOutput extends Search>(
  self: Definition<Content, ParamsOutput, SearchOutput>,
  path: AbsolutePath,
): Definition<Content, ParamsOutput, SearchOutput> => internal.prefixRoute(self, path))

/** Add a single Effect ServiceMap annotation to a route. */
export const annotate: {
  <I, S>(tag: ServiceMap.Key<I, S>, value: S): <Content, ParamsOutput extends Params, SearchOutput extends Search>(
    self: Definition<Content, ParamsOutput, SearchOutput>,
  ) => Definition<Content, ParamsOutput, SearchOutput>
  <Content, ParamsOutput extends Params, SearchOutput extends Search, I, S>(
    self: Definition<Content, ParamsOutput, SearchOutput>,
    tag: ServiceMap.Key<I, S>,
    value: S,
  ): Definition<Content, ParamsOutput, SearchOutput>
} = dual(3, <Content, ParamsOutput extends Params, SearchOutput extends Search, I, S>(
  self: Definition<Content, ParamsOutput, SearchOutput>,
  tag: ServiceMap.Key<I, S>,
  value: S,
): Definition<Content, ParamsOutput, SearchOutput> => internal.annotateRoute(self, tag, value))

/** Merge multiple Effect ServiceMap annotations into a route. */
export const annotateMerge: {
  (annotations: Annotations): <Content, ParamsOutput extends Params, SearchOutput extends Search>(
    self: Definition<Content, ParamsOutput, SearchOutput>,
  ) => Definition<Content, ParamsOutput, SearchOutput>
  <Content, ParamsOutput extends Params, SearchOutput extends Search>(
    self: Definition<Content, ParamsOutput, SearchOutput>,
    annotations: Annotations,
  ): Definition<Content, ParamsOutput, SearchOutput>
} = dual(2, <Content, ParamsOutput extends Params, SearchOutput extends Search>(
  self: Definition<Content, ParamsOutput, SearchOutput>,
  annotations: Annotations,
): Definition<Content, ParamsOutput, SearchOutput> => internal.annotateRouteMerge(self, annotations))

/** Read the stable route path. */
export const path = <Content, ParamsOutput extends Params, SearchOutput extends Search>(
  self: Definition<Content, ParamsOutput, SearchOutput>,
): Path => self.path

/** Read the route content payload. */
export const content = <Content, ParamsOutput extends Params, SearchOutput extends Search>(
  self: Definition<Content, ParamsOutput, SearchOutput>,
): Content => self.content

/** Read the route children. */
export const children = <Content, ParamsOutput extends Params, SearchOutput extends Search>(
  self: Definition<Content, ParamsOutput, SearchOutput>,
): ReadonlyArray<Definition> => self.children

/** Read a single annotation value from a merged annotation map. */
export const getAnnotation = <I, S>(annotations: Annotations, tag: ServiceMap.Key<I, S>): unknown =>
  getAnnotationValue(annotations, tag)

/** Encode a stable href for an absolute route definition. */
export const href = <Content, ParamsOutput extends Params, SearchOutput extends Search>(
  self: Definition<Content, ParamsOutput, SearchOutput>,
  options?: HrefOptions<ParamsOutput, SearchOutput>,
  base?: string | URL,
): string => {
  const pathname = self.path

  if (!pathname.startsWith("/")) {
    throw new UnsupportedPathError("Route.href(...) only supports absolute routes in the current router slice")
  }

  return buildUrl(
    {
      pathname: normalizePathname(pathname),
      params: options?.params,
      search: options?.query,
      hash: options?.hash,
    },
    base,
  ).toString()
}

/** Reflect a route tree into effective pathnames and merged annotations. */
export const reflect = (self: Definition, options: ReflectOptions): void => {
  const predicate = options.predicate

  reflectRoutes([self], {
    inheritedAnnotations: emptyAnnotations(),
    inheritedFallback: {},
    inheritedLayouts: [],
    predicate: predicate === undefined ? undefined : (route) => predicate({ route: route.route, path: route.path }),
    onRoute: (route) => {
      options.onRoute({
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
