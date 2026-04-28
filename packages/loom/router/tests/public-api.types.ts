import type * as Loom from "@effectify/loom"
import { Component, View } from "@effectify/loom"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { pipe } from "effect"
import * as Result from "effect/Result"
import {
  Decode,
  Fallback,
  Layout,
  Link,
  Match,
  Navigation,
  Route,
  RouteGroup,
  RouteModule,
  Router,
  Runtime,
  Submission,
} from "../src/index.js"

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
  ? true
  : false
type Expect<Value extends true> = Value
type RootHasActionInput = "ActionInput" extends keyof typeof import("../src/index.js") ? true : false

const route = Route.make({
  identifier: "users.detail",
  path: "/users/:userId",
  content: "user-screen",
  decode: {
    params: Decode.make((params) => Result.succeed({ userId: params.userId })),
    search: Decode.make((search) => Result.succeed({ tab: typeof search.tab === "string" ? search.tab : "overview" })),
  },
})
const routeWithLoader = Route.loader(route, {
  load: async (
    { context }: { readonly context: Router.Context<{ readonly userId: string }, { readonly tab: string }> },
  ) => ({
    id: context.params.userId,
    tab: context.query.tab,
  }),
  mapError: (cause: unknown) => ({ message: String(cause) }),
})
const routeWithAction = Route.action(routeWithLoader, {
  input: Submission.make((input) =>
    typeof input.title === "string"
      ? Submission.succeed({ title: input.title })
      : Submission.fail("title missing", input)
  ),
  handle: async (
    { input }: Route.ActionContext<{ readonly userId: string }, { readonly tab: string }, { readonly title: string }>,
  ) => ({
    savedTitle: input.title,
  }),
  mapError: (cause: unknown) => ({ message: String(cause) }),
})
const attachedLoader = Route.getLoader(routeWithAction)
const attachedAction = Route.getAction(routeWithAction)

const routeComponent = Component.make("RouterPage").pipe(
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
const routeOnlyRouter = Router.make("app")
const componentRoute = Route.make({ path: "/component", content: routeComponent })
const router = pipe(
  routeOnlyRouter,
  Router.layout(layout),
  Router.notFound(fallback),
  Router.route(route),
  Router.route(componentRoute),
)
const compatRouter = Router.from({
  routes: [route, componentRoute],
  layout,
  fallback,
})
const legacyCompatRouter = Router.make({
  routes: [route, componentRoute],
  layout,
  fallback,
})
const builderLayoutRouter = Router.layout(layout)(routeOnlyRouter)
const builderFallbackRouter = Router.notFound(fallback)(routeOnlyRouter)
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
const RouterTitle = Context.Service<{ readonly title: string }>("RouterTitle")
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
const compatRoutePathFrom = Router.pathFor(compatRouter, route)
const compatRoutePathFromLegacy = Router.pathFor(legacyCompatRouter, route)
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
const typedRouteBuilder = pipe(Router.make("typed"), Router.route(route), Router.add(routeGroup))
const nestedIndexHref = Router.href(nestedTypedRouter, "posts.index")
const nestedLeafHref = Router.href(nestedTypedRouter, "posts.detail", {
  params: { postId: "42" },
  query: { mode: "preview" },
})
const nestedLeafHrefByRoute = Router.href(nestedTypedRouter, nestedLeafRoute, {
  params: { postId: "7" },
  query: { mode: "read" },
})
const loaderState: Runtime.LoaderState<typeof routeWithAction> = Runtime.success(routeWithAction, {
  id: "42",
  tab: "profile",
})
const actionState: Runtime.ActionState<typeof routeWithAction> = Runtime.actionSuccess(
  routeWithAction,
  { savedTitle: "hello" },
  false,
)
const invalidActionState: Runtime.ActionState<typeof routeWithAction> = Runtime.invalidInput(
  routeWithAction,
  { title: "" },
  [{ _tag: "LoomRouterActionInputFailure", input: { title: "" }, message: "title missing" }],
)
const moduleLoader = Route.loader({
  params: Schema.Struct({ userId: Schema.String }),
  output: Schema.Struct({ id: Schema.String }),
  load: ({ params }) => Effect.succeed({ id: params.userId }),
})
const moduleLoaderWithServicesOptions = {
  params: Schema.Struct({ userId: Schema.String }),
  search: Schema.Struct({ tab: Schema.String }),
  output: Schema.Struct({ id: Schema.String, tab: Schema.String, requestId: Schema.String }),
} as const
const moduleLoaderWithServices = pipe(
  Effect.fn(function*({
    params,
    search,
    services,
  }: Route.ModuleLoaderContext<typeof moduleLoaderWithServicesOptions, { readonly requestId: string }>) {
    return {
      id: params.userId,
      requestId: services.requestId,
      tab: search.tab,
    }
  }),
  Route.loader(moduleLoaderWithServicesOptions),
)
const moduleAction = Route.action({
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.Struct({ savedTitle: Schema.String }),
  error: Schema.TaggedStruct("SaveFailure", { message: Schema.String }),
  handle: ({ input }) =>
    Effect.fail({ _tag: "SaveFailure" as const, message: input.title.length > 0 ? "boom" : "empty" }),
})
const moduleActionWithServicesOptions = {
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.Struct({ savedTitle: Schema.String }),
  error: Schema.TaggedStruct("SaveFailure", { message: Schema.String }),
} as const
const moduleActionWithServices = pipe(
  Effect.fn(function*({
    input,
    services,
  }: Route.ModuleActionContext<typeof moduleActionWithServicesOptions, { readonly requestId: string }>) {
    return yield* Effect.fail({
      _tag: "SaveFailure" as const,
      message: input.title.length > 0 ? services.requestId : "empty",
    })
  }),
  Route.action(moduleActionWithServicesOptions),
)
const compiledRoute = RouteModule.compile({
  identifier: "users.module",
  module: {
    component: "module-screen",
    loader: moduleLoader,
    action: moduleAction,
  },
  path: "/module/:userId",
})
const componentOnlyCompiledRoute = RouteModule.compile({
  identifier: "users.component-only",
  module: {
    component: routeComponent,
  },
  path: "/component-only",
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
export type CompatRoutePathFromContract = Expect<Equal<typeof compatRoutePathFrom, Route.AbsolutePath | undefined>>
export type CompatRoutePathFromLegacyContract = Expect<
  Equal<typeof compatRoutePathFromLegacy, Route.AbsolutePath | undefined>
>
type AlgebraRoutePathContract = Expect<Equal<typeof algebraRoutePath, Route.AbsolutePath | undefined>>
type AlgebraRouteHrefContract = Expect<Equal<typeof algebraRouteHref, string>>
type NestedIndexHrefContract = Expect<Equal<typeof nestedIndexHref, string>>
type NestedLeafHrefContract = Expect<Equal<typeof nestedLeafHref, string>>
type NestedLeafHrefByRouteContract = Expect<Equal<typeof nestedLeafHrefByRoute, string>>
type RootActionInputHiddenContract = Expect<Equal<RootHasActionInput, false>>
type RouteActionContextContract = Expect<
  Equal<Route.ActionContextOf<typeof routeWithAction>, { readonly title: string }>
>
type RouteHasLoaderContract = Expect<Equal<typeof attachedLoader extends undefined ? false : true, true>>
type RouteHasActionContract = Expect<Equal<typeof attachedAction extends undefined ? false : true, true>>
type RouteLoadedDataContract = Expect<
  Route.LoadedDataOf<typeof routeWithAction> extends { id: string; tab: string } ? true : false
>
type RouteLoaderErrorContract = Expect<Equal<Route.LoaderErrorOf<typeof routeWithAction>, { message: string }>>
type RouteActionInputContract = Expect<Equal<Route.ActionInputOf<typeof routeWithAction>, { readonly title: string }>>
type RouteActionResultContract = Expect<Equal<Route.ActionResultOf<typeof routeWithAction>, { savedTitle: string }>>
type RouteActionErrorContract = Expect<Equal<Route.ActionErrorOf<typeof routeWithAction>, { message: string }>>
type LoaderStateContract = Expect<Equal<typeof loaderState, Runtime.LoaderState<typeof routeWithAction>>>
type ActionStateContract = Expect<Equal<typeof actionState, Runtime.ActionState<typeof routeWithAction>>>
type InvalidActionStateContract = Expect<Equal<typeof invalidActionState, Runtime.ActionState<typeof routeWithAction>>>
type ModuleLoaderParamsContract = Expect<
  Equal<Route.ModuleLoaderParamsOf<typeof moduleLoader>, { readonly userId: string }>
>
type ModuleLoaderDataContract = Expect<Equal<Route.ModuleLoaderDataOf<typeof moduleLoader>, { readonly id: string }>>
type ModuleLoaderWithServicesParamsContract = Expect<
  Equal<Route.ModuleLoaderParamsOf<typeof moduleLoaderWithServices>, { readonly userId: string }>
>
type ModuleLoaderWithServicesSearchContract = Expect<
  Equal<Route.ModuleLoaderSearchOf<typeof moduleLoaderWithServices>, { readonly tab: string }>
>
type ModuleLoaderWithServicesDataContract = Expect<
  Route.ModuleLoaderDataOf<typeof moduleLoaderWithServices> extends {
    readonly id: string
    readonly requestId: string
    readonly tab: string
  } ? true
    : false
>
type ModuleLoaderWithServicesContract = Expect<
  Equal<Route.ModuleLoaderServicesOf<typeof moduleLoaderWithServices>, { readonly requestId: string }>
>
type ModuleActionInputContract = Expect<
  Equal<Route.ModuleActionInputOf<typeof moduleAction>, { readonly title: string }>
>
type ModuleActionContextContract = Expect<
  Equal<Route.ModuleActionContextOf<typeof moduleAction>, { readonly title: string }>
>
type ModuleActionResultContract = Expect<
  Equal<Route.ModuleActionResultOf<typeof moduleAction>, { readonly savedTitle: string }>
>
type ModuleActionErrorContract = Expect<
  Equal<Route.ModuleActionErrorOf<typeof moduleAction>, { readonly _tag: "SaveFailure"; readonly message: string }>
>
type ModuleActionWithServicesInputContract = Expect<
  Equal<Route.ModuleActionInputOf<typeof moduleActionWithServices>, { readonly title: string }>
>
type ModuleActionWithServicesResultContract = Expect<
  Equal<Route.ModuleActionResultOf<typeof moduleActionWithServices>, { readonly savedTitle: string }>
>
type ModuleActionWithServicesErrorContract = Expect<
  Route.ModuleActionErrorOf<typeof moduleActionWithServices> extends { _tag: "SaveFailure"; message: string } ? true
    : false
>
type ModuleActionWithServicesContract = Expect<
  Equal<Route.ModuleActionServicesOf<typeof moduleActionWithServices>, { readonly requestId: string }>
>
type CompiledRouteIdentifierContract = Expect<Equal<Route.IdentifierOf<typeof compiledRoute>, "users.module">>
type CompiledRouteParamsContract = Expect<Equal<Route.ParamsOf<typeof compiledRoute>, { readonly userId: string }>>
type CompiledRouteLoadedDataContract = Expect<Equal<Route.LoadedDataOf<typeof compiledRoute>, { readonly id: string }>>
type CompiledRouteActionInputContract = Expect<
  Equal<Route.ActionInputOf<typeof compiledRoute>, { readonly title: string }>
>
type ComponentOnlyCompiledRouteIdentifierContract = Expect<
  Equal<Route.IdentifierOf<typeof componentOnlyCompiledRoute>, "users.component-only">
>
type ComponentOnlyCompiledRouteContentContract = Expect<
  Equal<Route.Content<typeof componentOnlyCompiledRoute>, typeof routeComponent>
>
export type BuilderLayoutContract = Expect<Equal<typeof builderLayoutRouter, Router.Definition<readonly []>>>
export type BuilderFallbackContract = Expect<Equal<typeof builderFallbackRouter, Router.Definition<readonly []>>>
export type BuilderRouteContract = Expect<
  Equal<typeof typedRouteBuilder, Router.Definition<[typeof route, typeof routeGroup]>>
>

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
  routeWithAction,
  routeWithLoader,
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
  loaderState,
  actionState,
  compiledRoute,
  componentOnlyCompiledRoute,
  invalidActionState,
  moduleAction,
  moduleActionWithServices,
  moduleLoader,
  moduleLoaderWithServices,
  attachedLoader,
  attachedAction,
}

export type {
  ActionStateContract,
  AlgebraRouteHrefContract,
  AlgebraRoutePathContract,
  CompatRoutePathContract,
  CompiledRouteActionInputContract,
  CompiledRouteIdentifierContract,
  CompiledRouteLoadedDataContract,
  CompiledRouteParamsContract,
  ComponentOnlyCompiledRouteContentContract,
  ComponentOnlyCompiledRouteIdentifierContract,
  GroupedRoutesContract,
  IdentityContract,
  InvalidActionStateContract,
  LinkHrefContract,
  LinkInterceptContract,
  LoaderStateContract,
  MatchResultContract,
  ModuleActionContextContract,
  ModuleActionErrorContract,
  ModuleActionInputContract,
  ModuleActionResultContract,
  ModuleActionWithServicesContract,
  ModuleActionWithServicesErrorContract,
  ModuleActionWithServicesInputContract,
  ModuleActionWithServicesResultContract,
  ModuleLoaderDataContract,
  ModuleLoaderParamsContract,
  ModuleLoaderWithServicesContract,
  ModuleLoaderWithServicesDataContract,
  ModuleLoaderWithServicesParamsContract,
  ModuleLoaderWithServicesSearchContract,
  NavigationSnapshotContract,
  NestedIndexHrefContract,
  NestedLeafHrefByRouteContract,
  NestedLeafHrefContract,
  NestedLeafIdentifierContract,
  NestedLeafParamsContract,
  NestedLeafSearchContract,
  ResolvedOutputContract,
  ResolveResultContract,
  RootActionInputHiddenContract,
  RouteActionContextContract,
  RouteActionErrorContract,
  RouteActionInputContract,
  RouteActionResultContract,
  RouteHasActionContract,
  RouteHasLoaderContract,
  RouteHrefContract,
  RouteIdentifierContract,
  RouteLoadedDataContract,
  RouteLoaderErrorContract,
}
