import { pipe, ServiceMap } from "effect"
import * as Result from "effect/Result"
import { Decode, Fallback, Layout, Link, Match, Navigation, Route, RouteGroup, Router } from "../src/index.js"

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
  ? true
  : false
type Expect<Value extends true> = Value

const route = Route.make({
  path: "/users/:userId",
  content: "user-screen",
  decode: {
    params: Decode.make((params) => Result.succeed({ userId: params.userId })),
    search: Decode.make((search) => Result.succeed({ tab: typeof search.tab === "string" ? search.tab : "overview" })),
  },
})

const nestedLeafRoute = Route.child({
  path: ":postId",
  content: "post-screen",
  decode: {
    params: Decode.make((params) => Result.succeed({ postId: params.postId })),
    search: Decode.make((search) => Result.succeed({ mode: typeof search.mode === "string" ? search.mode : "read" })),
  },
})

const nestedRoute = Route.make({
  path: "/posts",
  content: "posts-shell",
  children: [nestedLeafRoute],
})

const layout = Layout.make("shell")
const fallback = Fallback.make("missing")
const router = Router.make({
  routes: [route],
  layout,
  fallback,
})
const result = Router.match(router, new URL("https://effectify.dev/users/42?tab=profile"))
const identityDecoder = Decode.identity<Route.Params>()
const routeContent: Route.Content<typeof route> = "user-screen"
const routeParams: Route.ParamsOf<typeof route> = { userId: "42" }
const routeSearch: Route.SearchOf<typeof route> = { tab: "profile" }
const nestedLeafParams: Route.ParamsOf<typeof nestedLeafRoute> = { postId: "42" }
const nestedLeafSearch: Route.SearchOf<typeof nestedLeafRoute> = { mode: "preview" }
const resolveResult: Router.ResolveResult = Router.resolve(
  router,
  new URL("https://effectify.dev/users/42?tab=profile"),
)
const RouterTitle = ServiceMap.Service<{ readonly title: string }>("RouterTitle")
const routeGroup = pipe(RouteGroup.make("users"), RouteGroup.add(route))
const algebraRouter = pipe(
  Router.make("app"),
  Router.prefix("/app"),
  Router.annotate(RouterTitle, { title: "loom" }),
  Router.add(routeGroup),
)
const groupedRoutes: ReadonlyArray<RouteGroup.Definition> = Router.groups(algebraRouter)
const navigation = Navigation.memory("https://effectify.dev/users/1")
const navigationSnapshot = navigation.current()
const routeHref = Route.href(route, {
  params: { userId: "42" },
  query: { tab: "profile" },
})
const linkHref = Link.href("/users/42?tab=profile", navigationSnapshot.url)
const linkModifiers = Link.modifiers({
  navigation,
  to: "/users/42?tab=profile",
})
const linkIntercepted = Link.intercept({
  event: new MouseEvent("click", { bubbles: true, cancelable: true }),
  currentTarget: document.createElement("a"),
  navigation,
})

if (Match.isSuccess(result)) {
  const content: unknown = Route.content(result.route)
  const pathname: string = result.pathname
  const params: Route.Params = result.params
  const search = result.search

  void content
  void pathname
  void params
  void search
}

if (Match.isMiss(result)) {
  const fallbackContent: string = Fallback.content(fallback)

  void fallbackContent
}

if (Match.isDecodeFailure(result)) {
  const issues: ReadonlyArray<Decode.Issue> = result.issues

  void issues
}

if (Router.isResolveSuccess(resolveResult)) {
  const pathname: string = resolveResult.context.pathname
  const matches: ReadonlyArray<Match.RouteMatch> = resolveResult.context.matches

  void pathname
  void matches
}

if (Router.isResolveInvalidInput(resolveResult)) {
  const issues: ReadonlyArray<Decode.Issue> = resolveResult.issues

  void issues
}

if (Router.isResolveNotFound(resolveResult)) {
  const fallbackOutput = resolveResult.output

  void fallbackOutput
}

type MatchResultContract = Expect<Equal<typeof result, Match.Result>>
type IdentityContract = Expect<Equal<typeof identityDecoder, Decode.Decoder<Route.Params, Route.Params>>>
type NestedLeafParamsContract = Expect<Equal<typeof nestedLeafParams, { postId: string }>>
type NestedLeafSearchContract = Expect<Equal<typeof nestedLeafSearch, { mode: string }>>
type ResolveResultContract = Expect<Equal<typeof resolveResult, Router.ResolveResult>>
type GroupedRoutesContract = Expect<Equal<typeof groupedRoutes, ReadonlyArray<RouteGroup.Definition>>>
type NavigationSnapshotContract = Expect<Equal<typeof navigationSnapshot, Navigation.LocationSnapshot<unknown>>>
type RouteHrefContract = Expect<Equal<typeof routeHref, string>>
type LinkHrefContract = Expect<Equal<typeof linkHref, string>>
type LinkInterceptContract = Expect<Equal<typeof linkIntercepted, boolean>>

// @ts-expect-error route paths must start with a slash
Route.make({ path: "users/:userId", content: "broken" })

export const typecheckSmoke = {
  fallback,
  identityDecoder,
  layout,
  nestedLeafParams,
  nestedLeafSearch,
  nestedLeafRoute,
  nestedRoute,
  routeGroup,
  resolveResult,
  result,
  routeContent,
  routeParams,
  routeSearch,
  route,
  algebraRouter,
  groupedRoutes,
  linkHref,
  linkIntercepted,
  linkModifiers,
  navigation,
  navigationSnapshot,
  routeHref,
  router,
}

export type {
  GroupedRoutesContract,
  IdentityContract,
  LinkHrefContract,
  LinkInterceptContract,
  MatchResultContract,
  NavigationSnapshotContract,
  NestedLeafParamsContract,
  NestedLeafSearchContract,
  ResolveResultContract,
  RouteHrefContract,
}
