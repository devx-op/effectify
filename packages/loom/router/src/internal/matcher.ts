import * as Result from "effect/Result"
import type * as Fallback from "../fallback.js"
import * as Decode from "../decode.js"
import type * as Layout from "../layout.js"
import type * as Match from "../match.js"
import type * as Route from "../route.js"
import { runDecoder } from "./decode.js"
import { normalizePathname, parseLocation, tokenizePath } from "./path.js"

interface Candidate {
  readonly route: Route.Definition<any, any, any, any>
  readonly params: Route.Params
  readonly score: number
  readonly consumedSegments: number
  readonly matches: ReadonlyArray<Match.RouteMatch>
}

const STATIC_SEGMENT_SCORE = 4
const PARAM_SEGMENT_SCORE = 2
const INDEX_ROUTE_SCORE = 1

const matchSegments = (
  patternSegments: ReadonlyArray<string>,
  pathnameSegments: ReadonlyArray<string>,
  startIndex: number,
): Route.Params | undefined => {
  if (startIndex + patternSegments.length > pathnameSegments.length) {
    return undefined
  }

  const params: Record<string, string> = {}

  for (let index = 0; index < patternSegments.length; index++) {
    const patternSegment = patternSegments[index]
    const pathnameSegment = pathnameSegments[startIndex + index]

    if (patternSegment === undefined || pathnameSegment === undefined) {
      return undefined
    }

    if (patternSegment.startsWith(":")) {
      const name = patternSegment.slice(1)

      if (name.length === 0) {
        return undefined
      }

      params[name] = decodeURIComponent(pathnameSegment)
      continue
    }

    if (patternSegment !== pathnameSegment) {
      return undefined
    }
  }

  return params
}

const scoreSegments = (segments: ReadonlyArray<string>): number =>
  segments.reduce(
    (score, segment) => score + (segment.startsWith(":") ? PARAM_SEGMENT_SCORE : STATIC_SEGMENT_SCORE),
    0,
  )

const collectCandidates = (
  route: Route.Definition<any, any, any, any>,
  pathnameSegments: ReadonlyArray<string>,
  startIndex: number,
  inheritedParams: Route.Params,
  inheritedScore: number,
  inheritedMatches: ReadonlyArray<Match.RouteMatch>,
): ReadonlyArray<Candidate> => {
  const ownParams = matchSegments(route.segments, pathnameSegments, startIndex)

  if (ownParams === undefined) {
    return []
  }

  const nextParams = {
    ...inheritedParams,
    ...ownParams,
  }
  const nextIndex = startIndex + route.segments.length
  const nextScore = inheritedScore + scoreSegments(route.segments) + (route.kind === "index" ? INDEX_ROUTE_SCORE : 0)
  const matchedPathname = nextIndex === 0 ? "/" : `/${pathnameSegments.slice(0, nextIndex).join("/")}`
  const nextMatches = route.kind === "index" && nextIndex !== pathnameSegments.length
    ? inheritedMatches
    : [
      ...inheritedMatches,
      {
        route,
        pathname: matchedPathname,
        params: nextParams,
      },
    ]
  const candidates: Array<Candidate> = []

  if (route.kind !== "index" || nextIndex === pathnameSegments.length) {
    candidates.push({
      route,
      params: nextParams,
      score: nextScore,
      consumedSegments: nextIndex,
      matches: nextMatches,
    })
  }

  for (const child of route.children) {
    candidates.push(...collectCandidates(child, pathnameSegments, nextIndex, nextParams, nextScore, nextMatches))
  }

  return candidates
}

const selectCandidate = (
  routes: ReadonlyArray<Route.Definition<any, any, any, any>>,
  pathnameSegments: ReadonlyArray<string>,
): { readonly exact: Candidate | undefined; readonly closest: Candidate | undefined } => {
  let exact: Candidate | undefined
  let closest: Candidate | undefined

  for (const route of routes) {
    for (const candidate of collectCandidates(route, pathnameSegments, 0, {}, 0, [])) {
      if (
        candidate.consumedSegments === pathnameSegments.length && (exact === undefined || candidate.score > exact.score)
      ) {
        exact = candidate
      }

      if (
        closest === undefined ||
        candidate.consumedSegments > closest.consumedSegments ||
        (candidate.consumedSegments === closest.consumedSegments && candidate.score > closest.score)
      ) {
        closest = candidate
      }
    }
  }

  return {
    exact,
    closest,
  }
}

export const matchRoutes = (
  routes: ReadonlyArray<Route.Definition<any, any, any, any>>,
  input: string | URL,
  layout: Layout.Definition | undefined,
  fallback: Fallback.Definition | undefined,
): Match.Result => {
  const location = parseLocation(input)
  const url = input instanceof URL ? input : new URL(input, "https://effectify.dev")
  const pathname = normalizePathname(location.pathname)
  const pathnameSegments = tokenizePath(pathname)
  const candidate = selectCandidate(routes, pathnameSegments)

  if (candidate.exact !== undefined) {
    const decodedParams = runDecoder(
      candidate.exact.route.decode.params ?? Decode.identity<Route.Params>(),
      candidate.exact.params,
      "params",
    )
    const decodedSearch = runDecoder(
      candidate.exact.route.decode.search ?? Decode.identity<Route.Search>(),
      location.search,
      "search",
    )

    if (Result.isFailure(decodedParams) && Result.isFailure(decodedSearch)) {
      return {
        _tag: "LoomRouterMatchDecodeFailure",
        url,
        pathname,
        route: candidate.exact.route,
        params: candidate.exact.params,
        search: location.search,
        issues: [...decodedParams.failure, ...decodedSearch.failure],
        matches: candidate.exact.matches,
      }
    }

    if (Result.isFailure(decodedParams)) {
      return {
        _tag: "LoomRouterMatchDecodeFailure",
        url,
        pathname,
        route: candidate.exact.route,
        params: candidate.exact.params,
        search: location.search,
        issues: decodedParams.failure,
        matches: candidate.exact.matches,
      }
    }

    if (Result.isFailure(decodedSearch)) {
      return {
        _tag: "LoomRouterMatchDecodeFailure",
        url,
        pathname,
        route: candidate.exact.route,
        params: candidate.exact.params,
        search: location.search,
        issues: decodedSearch.failure,
        matches: candidate.exact.matches,
      }
    }

    return {
      _tag: "LoomRouterMatchSuccess",
      url,
      pathname,
      route: candidate.exact.route,
      params: decodedParams.success,
      search: decodedSearch.success,
      layout,
      matches: candidate.exact.matches,
    }
  }

  return {
    _tag: "LoomRouterMatchMiss",
    url,
    pathname,
    fallback,
    route: candidate.closest?.route,
    params: candidate.closest?.params ?? {},
    search: location.search,
    matches: candidate.closest?.matches ?? [],
  }
}
