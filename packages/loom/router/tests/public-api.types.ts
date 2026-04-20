import type * as Loom from "@effectify/loom"
import { Component, View } from "@effectify/loom"
import { pipe, ServiceMap } from "effect"
import * as Result from "effect/Result"
import { Decode, Fallback, Layout, Link, Match, Navigation, Route, RouteGroup, Router } from "../src/index.js"

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
  ? true
  : false
type Expect<Value extends true> = Value

const route = Route.make({
  identifier: "users.detail",
  path: "/users/:userId",
  content: "user-screen",
  decode: {
    params: Decode.make((params) => Result.succeed({ userId: params.userId })),
    search: Decode.make((search) => Result.succeed({ tab: typeof search.tab === "string" ? search.tab : "overview" })),
  },
})

const routeComponent = Component.make("router-page").pipe(
  Component.view(() => View.stack(View.text("router-page"))),
)

const nestedLeafRoute = Route.child({
  identifier: "posts.detail",
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

const renderable: Loom.View.Child = View.stack(View.text("router-renderable"))
const layout = Layout.make(({ child }) => View.main(child))
const fallback = Fallback.make(({ pathname }: { readonly pathname: string }) => View.stack(View.text(pathname)))
const router = Router.make({
  routes: [route, Route.make({ path: "/component", content: routeComponent })],
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
const resolvedOutput: Loom.View.Child | undefined = resolveResult.output
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
const routeIdentifier = Route.identifier(route)
const nestedLeafIdentifier = Route.identifier(nestedLeafRoute)
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
const algebraRoute = Router.find(algebraRouter, "users.detail")
const compatRoutePath = Router.pathFor(router, route)
const algebraRoutePath = Router.pathFor(algebraRouter, "users.detail")
const algebraRouteHref = Router.href(algebraRouter, "users.detail", {
  params: { userId: "42" },
  query: { tab: "profile" },
})
const nestedIndexRoute = Route.index({
  identifier: "posts.index",
  content: "posts-home",
})
const nestedTypedRouter = Router.make({
  routes: [
    Route.make({
      path: "/posts",
      content: "posts-shell",
      children: [nestedIndexRoute, nestedRoute],
    }),
  ],
})
const nestedIndexHref = Router.href(nestedTypedRouter, "posts.index")
const nestedLeafHref = Router.href(nestedTypedRouter, "posts.detail", {
  params: { postId: "42" },
  query: { mode: "preview" },
})
const nestedLeafHrefByRoute = Router.href(nestedTypedRouter, nestedLeafRoute, {
  params: { postId: "7" },
  query: { mode: "read" },
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
  const fallbackContent: Fallback.Content<{ readonly pathname: string }> = Fallback.content(fallback)

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
type RouteIdentifierContract = Expect<Equal<typeof routeIdentifier, "users.detail">>
type NestedLeafIdentifierContract = Expect<Equal<typeof nestedLeafIdentifier, "posts.detail">>
type ResolveResultContract = Expect<Equal<typeof resolveResult, Router.ResolveResult>>
type ResolvedOutputContract = Expect<Equal<typeof resolvedOutput, Loom.View.Child | undefined>>
type GroupedRoutesContract = Expect<Equal<typeof groupedRoutes, ReadonlyArray<RouteGroup.Definition>>>
type NavigationSnapshotContract = Expect<Equal<typeof navigationSnapshot, Navigation.LocationSnapshot<unknown>>>
type RouteHrefContract = Expect<Equal<typeof routeHref, string>>
type LinkHrefContract = Expect<Equal<typeof linkHref, string>>
type LinkInterceptContract = Expect<Equal<typeof linkIntercepted, boolean>>
type CompatRoutePathContract = Expect<Equal<typeof compatRoutePath, Route.AbsolutePath | undefined>>
type AlgebraRoutePathContract = Expect<Equal<typeof algebraRoutePath, Route.AbsolutePath | undefined>>
type AlgebraRouteHrefContract = Expect<Equal<typeof algebraRouteHref, string>>
type NestedIndexHrefContract = Expect<Equal<typeof nestedIndexHref, string>>
type NestedLeafHrefContract = Expect<Equal<typeof nestedLeafHref, string>>
type NestedLeafHrefByRouteContract = Expect<Equal<typeof nestedLeafHrefByRoute, string>>

// @ts-expect-error route paths must start with a slash
Route.make({ path: "users/:userId", content: "broken" })

// @ts-expect-error typed router href requires known identifiers
Router.href(nestedTypedRouter, "posts.missing")

// @ts-expect-error href params must respect the route contract
Router.href(nestedTypedRouter, "posts.detail", { params: { postId: 42 } })

// @ts-expect-error href query must respect the route contract
Router.href(nestedTypedRouter, "posts.detail", { query: { mode: 1 } })

// @ts-expect-error href query cannot include unknown keys for typed routes
Router.href(nestedTypedRouter, "posts.detail", { query: { tab: "oops" } })

export const typecheckSmoke = {
  fallback,
  renderable,
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
  nestedLeafIdentifier,
  nestedIndexHref,
  nestedIndexRoute,
  routeHref,
  routeIdentifier,
  router,
  algebraRoute,
  algebraRouteHref,
  algebraRoutePath,
  compatRoutePath,
  nestedLeafHref,
  nestedLeafHrefByRoute,
  nestedTypedRouter,
}

export type {
  AlgebraRouteHrefContract,
  AlgebraRoutePathContract,
  CompatRoutePathContract,
  GroupedRoutesContract,
  IdentityContract,
  LinkHrefContract,
  LinkInterceptContract,
  MatchResultContract,
  NavigationSnapshotContract,
  NestedIndexHrefContract,
  NestedLeafHrefByRouteContract,
  NestedLeafHrefContract,
  NestedLeafIdentifierContract,
  NestedLeafParamsContract,
  NestedLeafSearchContract,
  ResolvedOutputContract,
  ResolveResultContract,
  RouteHrefContract,
  RouteIdentifierContract,
}
