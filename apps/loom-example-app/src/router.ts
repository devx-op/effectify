import type * as Loom from "@effectify/loom"
import { Component, Slot, View, Web } from "@effectify/loom"
import { Fallback, Layout, Router, type Router as RouterTypes } from "@effectify/loom-router"
import { counterPageRoute, counterRoutePath, counterRouteTitle } from "./routes/counter-route.js"

const appShell = Component.make("app-shell").pipe(
  Component.slots({ default: Slot.required() }),
  Component.view(({ slots }) =>
    View.main(slots.default).pipe(Web.className("container"), Web.data("app-shell", "loom-example-app"))
  ),
)

const notFoundView = (context: RouterTypes.Context): Loom.View.Child =>
  View.stack(
    View.stack(View.text("Route not found")).pipe(
      Web.className("loom-example-not-found-title"),
      Web.attr("role", "heading"),
      Web.aria("level", 1),
    ),
    View.stack(View.text(`The minimal Loom example only serves ${counterRoutePath}.`)).pipe(
      Web.className("loom-example-copy"),
    ),
    View.stack(View.text(`Requested path: ${context.pathname}`)).pipe(Web.className("loom-example-copy")),
  ).pipe(Web.className("loom-example-card loom-example-not-found"), Web.data("route-view", "not-found"))

export const appRouter = Router.make({
  layout: Layout.make(({ child }) => Component.use(appShell, undefined, { default: child })),
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

export const bodyForResult = (result: Router.ResolveResult): Loom.View.Child =>
  result.output ?? View.stack(View.text("Loom example route output is unavailable."))
