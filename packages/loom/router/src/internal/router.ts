import { Diagnostics, Html } from "@effectify/loom"
import type * as Loom from "@effectify/loom"
import * as Decode from "../decode.js"
import * as Result from "effect/Result"
import type * as Context from "effect/Context"
import { buildUrl, validateHrefInput } from "./path.js"
import type * as Fallback from "../fallback.js"
import type * as Layout from "../layout.js"
import * as Match from "../match.js"
import type * as Renderable from "../renderable.js"
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
import { reflectRoutes } from "./reflection.js"

export interface HrefResolutionErrorDetails {
  readonly routerIdentifier: string
  readonly target: string
  readonly reason: "missing" | "ambiguous"
  readonly candidates: ReadonlyArray<Route.AbsolutePath>
}

export class HrefResolutionError extends Error {
  readonly _tag = "LoomRouterHrefResolutionError"
  readonly details: HrefResolutionErrorDetails

  constructor(details: HrefResolutionErrorDetails) {
    super(
      details.reason === "ambiguous"
        ? `Router ${details.routerIdentifier} resolved ${details.target} to multiple routes: ${
          details.candidates.join(", ")
        }`
        : `Router ${details.routerIdentifier} could not resolve href target ${details.target}`,
    )
    this.name = "HrefResolutionError"
    this.details = details
  }
}

type KnownRoute = Route.AnyDefinition

export type RouterEntry = KnownRoute | RouteGroup.Definition<any>

export interface RouterDefinition<Entries extends ReadonlyArray<RouterEntry> = ReadonlyArray<RouterEntry>> {
  readonly _tag: "LoomRouter"
  readonly identifier: string
  readonly entries: Entries
  readonly routes: ReadonlyArray<KnownRoute>
  readonly groups: ReadonlyArray<RouteGroup.Definition<any>>
  readonly annotations: Route.Annotations
  readonly pathPrefix: Route.AbsolutePath | undefined
  readonly layout: Layout.Definition | undefined
  readonly fallback: Fallback.Boundaries
}

const toRoutes = <Entries extends ReadonlyArray<RouterEntry>>(
  entries: Entries,
): ReadonlyArray<KnownRoute> => {
  const routes: Array<KnownRoute> = []

  for (const entry of entries) {
    if (isRouteGroup(entry)) {
      routes.push(...entry.routes)
      continue
    }

    routes.push(entry as KnownRoute)
  }

  return routes
}

const toGroups = <Entries extends ReadonlyArray<RouterEntry>>(
  entries: Entries,
): ReadonlyArray<RouteGroup.Definition<any>> => entries.filter(isRouteGroup)

const applyPrefixToEntry = <Entry extends RouterEntry>(entry: Entry, prefix: Route.AbsolutePath): Entry => {
  if (isRouteGroup(entry)) {
    return prefixRouteGroup(entry, prefix) as unknown as Entry
  }

  return prefixRoute(entry as KnownRoute, prefix) as unknown as Entry
}

const makeDefinition = <Entries extends ReadonlyArray<RouterEntry>>(options: {
  readonly identifier: string
  readonly entries: Entries
  readonly annotations?: Route.Annotations
  readonly pathPrefix?: Route.AbsolutePath
  readonly layout?: Layout.Definition
  readonly fallback?: Fallback.Config
}): RouterDefinition<Entries> => ({
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

const copyRouter = <
  Entries extends ReadonlyArray<RouterEntry>,
  NextEntries extends ReadonlyArray<RouterEntry> = Entries,
>(
  self: RouterDefinition<Entries>,
  options: {
    readonly entries?: NextEntries
    readonly annotations?: Route.Annotations
    readonly pathPrefix?: Route.AbsolutePath
    readonly layout?: Layout.Definition
    readonly fallback?: Fallback.Config
  },
): RouterDefinition<NextEntries> =>
  makeDefinition({
    identifier: self.identifier,
    entries: options.entries ?? (self.entries as unknown as NextEntries),
    annotations: options.annotations ?? self.annotations,
    pathPrefix: options.pathPrefix ?? self.pathPrefix,
    layout: options.layout ?? self.layout,
    fallback: options.fallback ?? self.fallback,
  })

const isResolver = <Input>(value: unknown): value is Renderable.Resolver<Input> => typeof value === "function"

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
  route: KnownRoute,
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
  child: Renderable.Type,
): Renderable.Type =>
  layouts.reduceRight<Renderable.Type>(
    (current, layout) =>
      isResolver<Layout.Input<Router.Context>>(layout.content)
        ? layout.content({ child: current, context })
        : Html.fragment(toChild(layout.content), current),
    child,
  )

const renderPage = (content: unknown, context: Router.Context): Renderable.Type =>
  isResolver<Router.Context>(content) ? content(context) : toChild(content)

const renderFallback = <Input>(
  fallback: Fallback.Definition | undefined,
  input: Input,
): Renderable.Type | undefined => {
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

const reflectEntries = (
  self: RouterDefinition<ReadonlyArray<RouterEntry>>,
  onRoute: (route: {
    readonly route: KnownRoute
    readonly path: Route.AbsolutePath
  }) => void,
): void => {
  for (const entry of self.entries) {
    if (isRouteGroup(entry)) {
      reflectRoutes(entry.routes, {
        group: entry,
        inheritedAnnotations: mergeAnnotations(self.annotations, entry.annotations),
        inheritedFallback: self.fallback,
        inheritedLayouts: self.layout === undefined ? [] : [self.layout],
        onRoute,
      })
      continue
    }

    reflectRoutes([entry as KnownRoute], {
      inheritedAnnotations: self.annotations,
      inheritedFallback: self.fallback,
      inheritedLayouts: self.layout === undefined ? [] : [self.layout],
      onRoute,
    })
  }
}

const describeTarget = (target: string | KnownRoute): string => {
  if (typeof target === "string") {
    return `identifier:${target}`
  }

  if (target.identifier !== undefined) {
    return `identifier:${target.identifier}`
  }

  return `path:${target.path}`
}

const collectRouteMatches = (
  self: RouterDefinition<ReadonlyArray<RouterEntry>>,
  target: string | KnownRoute,
): Array<{ readonly route: KnownRoute; readonly path: Route.AbsolutePath }> => {
  const matches: Array<{ readonly route: KnownRoute; readonly path: Route.AbsolutePath }> = []

  reflectEntries(self, ({ route, path }) => {
    if (typeof target === "string") {
      if (route.identifier === target) {
        matches.push({ route, path })
      }

      return
    }

    if (route === target || (target.identifier !== undefined && route.identifier === target.identifier)) {
      matches.push({ route, path })
    }
  })

  return matches
}

const resolveHrefTarget = (
  self: RouterDefinition<ReadonlyArray<RouterEntry>>,
  target: string | KnownRoute,
): { readonly route: KnownRoute; readonly path: Route.AbsolutePath } => {
  const matches = collectRouteMatches(self, target)

  if (matches.length === 1) {
    return matches[0]!
  }

  throw new HrefResolutionError({
    routerIdentifier: self.identifier,
    target: describeTarget(target),
    reason: matches.length === 0 ? "missing" : "ambiguous",
    candidates: matches.map(({ path }) => path),
  })
}

export const makeRouter = <Routes extends ReadonlyArray<KnownRoute>>(
  options: Router.Options<Routes>,
): RouterDefinition<Routes> => {
  const withMetadata = withFallback(withLayout(makeEmptyRouter("compat"), options.layout), options.fallback)

  return withEntries(withMetadata, options.routes)
}

export const makeEmptyRouter = (identifier: string): RouterDefinition =>
  makeDefinition({
    identifier,
    entries: [],
  })

export const addEntryToRouter = <Entries extends ReadonlyArray<RouterEntry>, Entry extends RouterEntry>(
  self: RouterDefinition<Entries>,
  entry: Entry,
): RouterDefinition<[...Entries, Entry]> =>
  withEntries(self, [
    ...self.entries,
    self.pathPrefix === undefined ? entry : applyPrefixToEntry(entry, self.pathPrefix),
  ])

export const withEntries = <Entries extends ReadonlyArray<RouterEntry>, NextEntries extends ReadonlyArray<RouterEntry>>(
  self: RouterDefinition<Entries>,
  entries: NextEntries,
): RouterDefinition<NextEntries> =>
  copyRouter(self, {
    entries,
  })

export const withLayout = <Entries extends ReadonlyArray<RouterEntry>>(
  self: RouterDefinition<Entries>,
  layout: Layout.Definition | undefined,
): RouterDefinition<Entries> =>
  copyRouter(self, {
    layout,
  })

export const withFallback = <Entries extends ReadonlyArray<RouterEntry>>(
  self: RouterDefinition<Entries>,
  fallback: Fallback.Config | undefined,
): RouterDefinition<Entries> =>
  copyRouter(self, {
    fallback,
  })

export const prefixRouter = <Entries extends ReadonlyArray<RouterEntry>>(
  self: RouterDefinition<Entries>,
  prefix: Route.AbsolutePath,
): RouterDefinition<Entries> =>
  copyRouter(self, {
    entries: self.entries.map((entry) => applyPrefixToEntry(entry, prefix)) as unknown as Entries,
    pathPrefix: self.pathPrefix === undefined ? prefix : joinPathnames(self.pathPrefix, prefix),
  })

export const annotateRouter = <Entries extends ReadonlyArray<RouterEntry>, I, S>(
  self: RouterDefinition<Entries>,
  tag: Context.Service<I, S>,
  value: S,
): RouterDefinition<Entries> =>
  copyRouter(self, {
    annotations: annotateValue(self.annotations, tag, value),
  })

export const annotateRouterMerge = <Entries extends ReadonlyArray<RouterEntry>>(
  self: RouterDefinition<Entries>,
  annotations: Route.Annotations,
): RouterDefinition<Entries> =>
  copyRouter(self, {
    annotations: mergeAnnotations(self.annotations, annotations),
  })

export const findRouteByIdentifier = <Entries extends ReadonlyArray<RouterEntry>>(
  self: RouterDefinition<Entries>,
  identifier: string,
): KnownRoute | undefined => {
  const matches = collectRouteMatches(self, identifier)

  return matches[0]?.route
}

export const resolveRoutePath = <Entries extends ReadonlyArray<RouterEntry>>(
  self: RouterDefinition<Entries>,
  target: string | KnownRoute,
): Route.AbsolutePath | undefined => {
  const matches = collectRouteMatches(self, target)
  return matches[0]?.path
}

export const buildRouteHref = <Entries extends ReadonlyArray<RouterEntry>>(
  self: RouterDefinition<Entries>,
  target: string | KnownRoute,
  options?: Route.HrefOptions,
  base?: string | URL,
): string => {
  const resolved = resolveHrefTarget(self, target)

  validateHrefInput({
    params: options?.params,
    search: options?.query,
    decode: resolved.route.decode,
  })

  return buildUrl(
    {
      pathname: resolved.path,
      params: options?.params,
      search: options?.query,
      hash: options?.hash,
    },
    base,
  ).toString()
}

export const matchRouter = <Entries extends ReadonlyArray<RouterEntry>>(
  self: RouterDefinition<Entries>,
  input: string | URL,
): Match.Result => matchRoutes(self.routes, input, self.layout, self.fallback.notFound)

export const resolveRouter = <Entries extends ReadonlyArray<RouterEntry>>(
  self: RouterDefinition<Entries>,
  input: string | URL,
): Router.ResolveResult => {
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

export const renderRouter = <Entries extends ReadonlyArray<RouterEntry>>(
  self: RouterDefinition<Entries>,
  input: string | URL,
): Renderable.Type | undefined => resolveRouter(self, input).output
