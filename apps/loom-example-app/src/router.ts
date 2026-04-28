import type * as Loom from "@effectify/loom"
import { Component, html, View } from "@effectify/loom"
import { Fallback, Layout, RouteModule, Router, type Router as RouterTypes } from "@effectify/loom-router"
import { pipe } from "effect"
import { counterRouteId, counterRoutePath, counterRouteTitle } from "./routes/counter-route.js"
import * as counterRouteModule from "./routes/counter-route.js"
import * as todoRouteModule from "./routes/todo-route.js"

export const todoRouteId = "todo"
export const todoRoutePath = "/todos"
export const todoRouteTitle = "Todo app"

const ShellBody = Component.make("ShellBody").pipe(
  Component.view(({ props }: { readonly props: Readonly<{ content: Loom.View.ViewChild | undefined }> | undefined }) =>
    View.fragment(props?.content ?? "")
  ),
)

export const counterPageRoute = RouteModule.compile({
  identifier: counterRouteId,
  module: counterRouteModule,
  path: counterRoutePath,
})

export const todoPageRoute = RouteModule.compile({
  identifier: todoRouteId,
  module: {
    ...todoRouteModule,
    default: () => View.use(todoRouteModule.default),
  },
  path: todoRoutePath,
})

const AppShell = Component.make("AppShell").pipe(
  Component.view(({ children }) =>
    html`<main class="container" data-app-shell="loom-example-app">${children ?? ""}</main>`
  ),
)

const notFoundView = (context: RouterTypes.Context): Loom.View.ViewChild =>
  html`
    <div class="loom-example-card loom-example-not-found" data-route-view="not-found">
      <h1 class="loom-example-not-found-title" role="heading" aria-level="1">Route not found</h1>
      <span class="loom-example-copy">The Loom example serves ${counterRoutePath} and ${todoRoutePath}.</span>
      <span class="loom-example-copy">Requested path: ${context.pathname}</span>
    </div>
  `

export const appRouter = pipe(
  Router.make("app"),
  Router.layout(Layout.make(({ child }) => View.use(AppShell, View.use(ShellBody, { content: child })))),
  Router.notFound(Fallback.make(notFoundView)),
  Router.route(counterPageRoute),
  Router.route(todoPageRoute),
)

const matchedRouteTitle = (result: Router.ResolveSuccess): string => {
  switch (result.route.identifier) {
    case counterPageRoute.identifier:
      return counterRouteTitle
    case todoRouteId:
      return todoRouteTitle
    default:
      return "Not Found"
  }
}

export const resolveAppRequest = (input: string | URL): Router.ResolveResult => Router.resolve(appRouter, input)

export const titleForResult = (result: Router.ResolveResult): string =>
  Router.isResolveSuccess(result) ? matchedRouteTitle(result) : "Not Found"

export const statusForResult = (result: Router.ResolveResult): number => {
  if (Router.isResolveNotFound(result)) {
    return 404
  }

  if (Router.isResolveInvalidInput(result)) {
    return 400
  }

  return 200
}

export const bodyForResult = (result: Router.ResolveResult): Loom.View.ViewChild =>
  result.output ?? html`<div class="loom-example-card"><span>Loom example route output is unavailable.</span></div>`
