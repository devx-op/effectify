import type * as Loom from "@effectify/loom"
import { Component, View, Web } from "@effectify/loom"
import { Fallback, Layout, Router, type Router as RouterTypes } from "@effectify/loom-router"
import { counterPageRoute, counterRoutePath, counterRouteTitle } from "./routes/counter-route.js"

const appShell = Component.make("app-shell").pipe(
  Component.children(),
  Component.view(({ children }) =>
    View.main(children).pipe(Web.className("container"), Web.data("app-shell", "loom-example-app"))
  ),
)

const notFoundView = (context: RouterTypes.Context): Loom.View.ViewChild =>
  View.vstack(
    View.vstack(View.text("Route not found")).pipe(
      Web.className("loom-example-not-found-title"),
      Web.attr("role", "heading"),
      Web.aria("level", 1),
    ),
    View.vstack(View.text(`The minimal Loom example only serves ${counterRoutePath}.`)).pipe(
      Web.className("loom-example-copy"),
    ),
    View.vstack(View.text(`Requested path: ${context.pathname}`)).pipe(Web.className("loom-example-copy")),
  ).pipe(Web.className("loom-example-card loom-example-not-found"), Web.data("route-view", "not-found"))

export const appRouter = Router.make({
  layout: Layout.make(({ child }) => Component.use(appShell, child)),
  routes: [counterPageRoute],
  fallback: {
    notFound: Fallback.make(notFoundView),
  },
})

const matchedRouteTitle = (_result: Router.ResolveSuccess): string => counterRouteTitle

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
  result.output ?? View.vstack(View.text("Loom example route output is unavailable."))
