import { Html } from "@effectify/loom"
import * as Decode from "../decode.js"
import * as Result from "effect/Result"
import type * as Fallback from "../fallback.js"
import type * as Layout from "../layout.js"
import * as Match from "../match.js"
import type * as Route from "../route.js"
import type * as Router from "../router.js"
import { normalizeFallbacks } from "./fallback.js"
import { runDecoder } from "./decode.js"
import { matchRoutes } from "./matcher.js"

export interface RouterDefinition {
  readonly _tag: "LoomRouter"
  readonly routes: ReadonlyArray<Route.Definition>
  readonly layout: Layout.Definition | undefined
  readonly fallback: Fallback.Boundaries
}

const isResolver = <Input>(value: unknown): value is (input: Input) => Html.Child => typeof value === "function"

const isObjectChild = (value: unknown): value is Exclude<Html.Child, string | ReadonlyArray<Html.Child>> =>
  typeof value === "object" && value !== null

const toChild = (value: unknown): Html.Child => {
  if (typeof value === "string") {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(toChild)
  }

  if (isObjectChild(value)) {
    return value
  }

  return Html.fragment()
}

const buildContext = <Params extends Route.Params = Route.Params, Query extends Route.Search = Route.Search>(options: {
  readonly url: URL
  readonly pathname: string
  readonly params: Params
  readonly query: Query
  readonly matches: ReadonlyArray<Match.RouteMatch>
}): Router.Context<Params, Query> => ({
  url: options.url,
  pathname: options.pathname,
  params: options.params,
  query: options.query,
  matches: options.matches,
})

const decodeRouteInput = (
  route: Route.Definition,
  params: Route.Params,
  search: Route.Search,
):
  | { readonly _tag: "success"; readonly params: Route.Params; readonly query: Route.Search }
  | { readonly _tag: "failure"; readonly issues: ReadonlyArray<Decode.Issue> } =>
{
  const decodedParams = runDecoder(route.decode.params ?? Decode.identity<Route.Params>(), params, "params")
  const decodedSearch = runDecoder(route.decode.search ?? Decode.identity<Route.Search>(), search, "search")

  if (Result.isFailure(decodedParams) && Result.isFailure(decodedSearch)) {
    return {
      _tag: "failure",
      issues: [...decodedParams.failure, ...decodedSearch.failure],
    }
  }

  if (Result.isFailure(decodedParams)) {
    return {
      _tag: "failure",
      issues: decodedParams.failure,
    }
  }

  if (Result.isFailure(decodedSearch)) {
    return {
      _tag: "failure",
      issues: decodedSearch.failure,
    }
  }

  return {
    _tag: "success",
    params: decodedParams.success,
    query: decodedSearch.success,
  }
}

const collectLayouts = (
  appLayout: Layout.Definition | undefined,
  matches: ReadonlyArray<Match.RouteMatch>,
): ReadonlyArray<Layout.Definition> => [
  ...(appLayout === undefined ? [] : [appLayout]),
  ...matches.flatMap((match) => (match.route.layout === undefined ? [] : [match.route.layout])),
]

const foldLayouts = (
  layouts: ReadonlyArray<Layout.Definition>,
  context: Router.Context,
  child: Html.Child,
): Html.Child =>
  layouts.reduceRight<Html.Child>(
    (current, layout) =>
      isResolver<Layout.Input<Router.Context>>(layout.content)
        ? layout.content({ child: current, context })
        : Html.fragment(toChild(layout.content), current),
    child,
  )

const renderPage = (content: unknown, context: Router.Context): Html.Child =>
  isResolver<Router.Context>(content) ? content(context) : toChild(content)

const renderFallback = <Input>(fallback: Fallback.Definition | undefined, input: Input): Html.Child | undefined => {
  if (fallback === undefined) {
    return undefined
  }

  return isResolver<Input>(fallback.content) ? fallback.content(input) : toChild(fallback.content)
}

const selectFallback = (
  matches: ReadonlyArray<Match.RouteMatch>,
  fallback: Fallback.Boundaries,
  key: "notFound" | "invalidInput",
) => {
  for (let index = matches.length - 1; index >= 0; index--) {
    const match = matches[index]

    if (match !== undefined) {
      const local = match.route.fallback[key]

      if (local !== undefined) {
        return local
      }
    }
  }

  return fallback[key]
}

export const makeRouter = (options: Router.Options): RouterDefinition => ({
  _tag: "LoomRouter",
  routes: options.routes,
  layout: options.layout,
  fallback: normalizeFallbacks(options.fallback),
})

export const matchRouter = (self: RouterDefinition, input: string | URL): Match.Result =>
  matchRoutes(self.routes, input, self.layout, self.fallback.notFound)

export const resolveRouter = (self: RouterDefinition, input: string | URL): Router.ResolveResult => {
  const match = matchRoutes(self.routes, input, self.layout, self.fallback.notFound)

  if (Match.isSuccess(match)) {
    const context = buildContext({
      url: match.url,
      pathname: match.pathname,
      params: match.params,
      query: match.search,
      matches: match.matches,
    })
    const output = foldLayouts(
      collectLayouts(self.layout, match.matches),
      context,
      renderPage(match.route.content, context),
    )

    return {
      _tag: "LoomRouterResolveSuccess",
      context,
      route: match.route,
      output,
    }
  }

  if (Match.isDecodeFailure(match)) {
    const context = buildContext({
      url: match.url,
      pathname: match.pathname,
      params: match.params,
      query: match.search,
      matches: match.matches,
    })
    const fallback = selectFallback(match.matches, self.fallback, "invalidInput")
    const output = renderFallback(fallback, { context, issues: match.issues })

    return {
      _tag: "LoomRouterResolveInvalidInput",
      context,
      route: match.route,
      issues: match.issues,
      fallback,
      output: output === undefined
        ? undefined
        : foldLayouts(collectLayouts(self.layout, match.matches), context, output),
    }
  }

  const decoded = match.route === undefined ? undefined : decodeRouteInput(match.route, match.params, match.search)

  if (decoded?._tag === "failure") {
    const context = buildContext({
      url: match.url,
      pathname: match.pathname,
      params: match.params,
      query: match.search,
      matches: match.matches,
    })
    const fallback = selectFallback(match.matches, self.fallback, "invalidInput")
    const output = renderFallback(fallback, { context, issues: decoded.issues })

    return {
      _tag: "LoomRouterResolveInvalidInput",
      context,
      route: match.route,
      issues: decoded.issues,
      fallback,
      output: output === undefined
        ? undefined
        : foldLayouts(collectLayouts(self.layout, match.matches), context, output),
    }
  }

  const context = buildContext({
    url: match.url,
    pathname: match.pathname,
    params: decoded?._tag === "success" ? decoded.params : {},
    query: decoded?._tag === "success" ? decoded.query : match.search,
    matches: match.matches,
  })
  const fallback = selectFallback(match.matches, self.fallback, "notFound")
  const output = renderFallback(fallback, context)

  return {
    _tag: "LoomRouterResolveNotFound",
    context,
    fallback,
    output: output === undefined ? undefined : foldLayouts(collectLayouts(self.layout, match.matches), context, output),
  }
}

export const renderRouter = (self: RouterDefinition, input: string | URL): Html.Child | undefined =>
  resolveRouter(self, input).output
