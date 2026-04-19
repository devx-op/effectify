import { Diagnostics, Html } from "@effectify/loom"
import type * as Loom from "@effectify/loom"
import * as Decode from "../decode.js"
import * as Result from "effect/Result"
import type * as ServiceMap from "effect/ServiceMap"
import type * as Fallback from "../fallback.js"
import type * as Layout from "../layout.js"
import * as Match from "../match.js"
import type * as Route from "../route.js"
import type * as RouteGroup from "../route-group.js"
import type * as Router from "../router.js"
import { annotateValue, emptyAnnotations, mergeAnnotations } from "./annotations.js"
import { normalizeFallbacks } from "./fallback.js"
import { runDecoder } from "./decode.js"
import { matchRoutes } from "./matcher.js"
import { joinPathnames } from "./path.js"
import { isRouteGroup, prefixRouteGroup } from "./route-group.js"
import { prefixRoute } from "./route-dsl.js"

export interface RouterDefinition {
  readonly _tag: "LoomRouter"
  readonly identifier: string
  readonly entries: ReadonlyArray<RouterEntry>
  readonly routes: ReadonlyArray<Route.Definition>
  readonly groups: ReadonlyArray<RouteGroup.Definition>
  readonly annotations: Route.Annotations
  readonly pathPrefix: Route.AbsolutePath | undefined
  readonly layout: Layout.Definition | undefined
  readonly fallback: Fallback.Boundaries
}

export type RouterEntry = Route.Definition | RouteGroup.Definition

const toRoutes = (entries: ReadonlyArray<RouterEntry>): ReadonlyArray<Route.Definition> =>
  entries.flatMap((entry) => (isRouteGroup(entry) ? entry.routes : [entry]))

const toGroups = (entries: ReadonlyArray<RouterEntry>): ReadonlyArray<RouteGroup.Definition> =>
  entries.filter(isRouteGroup)

const applyPrefixToEntry = (entry: RouterEntry, prefix: Route.AbsolutePath): RouterEntry =>
  isRouteGroup(entry) ? prefixRouteGroup(entry, prefix) : prefixRoute(entry, prefix)

const makeDefinition = (options: {
  readonly identifier: string
  readonly entries: ReadonlyArray<RouterEntry>
  readonly annotations?: Route.Annotations
  readonly pathPrefix?: Route.AbsolutePath
  readonly layout?: Layout.Definition
  readonly fallback?: Fallback.Config
}): RouterDefinition => ({
  _tag: "LoomRouter",
  identifier: options.identifier,
  entries: options.entries,
  routes: toRoutes(options.entries),
  groups: toGroups(options.entries),
  annotations: options.annotations ?? emptyAnnotations(),
  pathPrefix: options.pathPrefix,
  layout: options.layout,
  fallback: normalizeFallbacks(options.fallback),
})

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

const emptyDiagnostics: ReadonlyArray<Loom.Diagnostics.Report> = []
const emptyDiagnosticSummary: ReadonlyArray<Loom.Diagnostics.Summary> = []

const makeRouterReport = (input: {
  readonly severity: Loom.Diagnostics.Severity
  readonly code: string
  readonly message: string
  readonly subject: string
  readonly details: Record<string, Loom.Diagnostics.JsonValue>
}): Loom.Diagnostics.Report => ({
  phase: "router",
  counts: {
    info: input.severity === "info" ? 1 : 0,
    warn: input.severity === "warn" ? 1 : 0,
    error: input.severity === "error" ? 1 : 0,
    fatal: input.severity === "fatal" ? 1 : 0,
  },
  highestSeverity: input.severity,
  issues: [
    {
      phase: "router",
      severity: input.severity,
      code: input.code,
      message: input.message,
      subject: input.subject,
      details: input.details,
    },
  ],
})

const withRouterDiagnostics = (report: Loom.Diagnostics.Report): {
  readonly diagnostics: ReadonlyArray<Loom.Diagnostics.Report>
  readonly diagnosticSummary: ReadonlyArray<Loom.Diagnostics.Summary>
} => ({
  diagnostics: [report],
  diagnosticSummary: [Diagnostics.summarize(report)],
})

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
  ...makeDefinition({
    identifier: "compat",
    entries: options.routes,
    layout: options.layout,
    fallback: options.fallback,
  }),
})

export const makeEmptyRouter = (identifier: string): RouterDefinition =>
  makeDefinition({
    identifier,
    entries: [],
  })

export const addEntryToRouter = (self: RouterDefinition, entry: RouterEntry): RouterDefinition =>
  makeDefinition({
    identifier: self.identifier,
    entries: [...self.entries, self.pathPrefix === undefined ? entry : applyPrefixToEntry(entry, self.pathPrefix)],
    annotations: self.annotations,
    pathPrefix: self.pathPrefix,
    layout: self.layout,
    fallback: self.fallback,
  })

export const prefixRouter = (self: RouterDefinition, prefix: Route.AbsolutePath): RouterDefinition =>
  makeDefinition({
    identifier: self.identifier,
    entries: self.entries.map((entry) => applyPrefixToEntry(entry, prefix)),
    annotations: self.annotations,
    pathPrefix: self.pathPrefix === undefined ? prefix : joinPathnames(self.pathPrefix, prefix),
    layout: self.layout,
    fallback: self.fallback,
  })

export const annotateRouter = <I, S>(
  self: RouterDefinition,
  tag: ServiceMap.Key<I, S>,
  value: S,
): RouterDefinition =>
  makeDefinition({
    identifier: self.identifier,
    entries: self.entries,
    annotations: annotateValue(self.annotations, tag, value),
    pathPrefix: self.pathPrefix,
    layout: self.layout,
    fallback: self.fallback,
  })

export const annotateRouterMerge = (self: RouterDefinition, annotations: Route.Annotations): RouterDefinition =>
  makeDefinition({
    identifier: self.identifier,
    entries: self.entries,
    annotations: mergeAnnotations(self.annotations, annotations),
    pathPrefix: self.pathPrefix,
    layout: self.layout,
    fallback: self.fallback,
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
      diagnostics: emptyDiagnostics,
      diagnosticSummary: emptyDiagnosticSummary,
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
      ...withRouterDiagnostics(
        makeRouterReport({
          severity: "warn",
          code: "loom.router.resolve.invalid-input",
          message: `Router input for ${match.route.path} could not be decoded for ${match.pathname}.`,
          subject: match.route.path,
          details: {
            pathname: match.pathname,
            issueCount: match.issues.length,
            issues: match.issues.map((issue) => ({
              phase: issue.phase,
              message: issue.message,
            })),
          },
        }),
      ),
    }
  }

  const decoded = match.route === undefined ? undefined : decodeRouteInput(match.route, match.params, match.search)

  if (match.route !== undefined && decoded?._tag === "failure") {
    const route = match.route

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
      route,
      issues: decoded.issues,
      fallback,
      output: output === undefined
        ? undefined
        : foldLayouts(collectLayouts(self.layout, match.matches), context, output),
      ...withRouterDiagnostics(
        makeRouterReport({
          severity: "warn",
          code: "loom.router.resolve.invalid-input",
          message: `Router input for ${route.path} could not be decoded for ${match.pathname}.`,
          subject: route.path,
          details: {
            pathname: match.pathname,
            issueCount: decoded.issues.length,
            issues: decoded.issues.map((issue) => ({
              phase: issue.phase,
              message: issue.message,
            })),
          },
        }),
      ),
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
    ...withRouterDiagnostics(
      makeRouterReport({
        severity: "warn",
        code: "loom.router.resolve.not-found",
        message: `Router could not resolve a matching route for ${match.pathname}.`,
        subject: match.pathname,
        details: {
          pathname: match.pathname,
          matchedRoutePath: match.route?.path ?? null,
          matchedRouteCount: match.matches.length,
        },
      }),
    ),
  }
}

export const renderRouter = (self: RouterDefinition, input: string | URL): Html.Child | undefined =>
  resolveRouter(self, input).output
