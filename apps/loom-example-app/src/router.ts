import { Html } from "@effectify/loom"
import { Layout, Route, Router } from "@effectify/loom-router"
import { renderAppShell } from "./app-shell.js"
import { docsAboutRoute, docsAboutRouteTitle } from "./routes/docs-about-route.js"
import { homeRoute, homeRouteTitle } from "./routes/home-route.js"
import { liveIslandRoute, liveIslandRouteTitle } from "./routes/live-island-route.js"
import { notFoundFallback, notFoundRouteTitle } from "./routes/not-found-route.js"
import { routeIds } from "./routes/route-ids.js"

export const appRouter = Router.make({
  layout: Layout.make(({ child }) => renderAppShell(child)),
  routes: [homeRoute, docsAboutRoute, liveIslandRoute],
  fallback: { notFound: notFoundFallback },
})

const matchedRouteTitle = (result: Router.ResolveSuccess): string => {
  const identifier = Route.identifier(result.route)

  switch (identifier) {
    case routeIds.docsAbout:
      return docsAboutRouteTitle
    case routeIds.liveIsland:
      return liveIslandRouteTitle
    case routeIds.home:
    default:
      return homeRouteTitle
  }
}

export const resolveAppRequest = (input: string | URL): Router.ResolveResult => Router.resolve(appRouter, input)

export const titleForResult = (result: Router.ResolveResult): string =>
  Router.isResolveSuccess(result) ? matchedRouteTitle(result) : notFoundRouteTitle

export const statusForResult = (result: Router.ResolveResult): number => {
  if (Router.isResolveNotFound(result)) {
    return 404
  }

  if (Router.isResolveInvalidInput(result)) {
    return 400
  }

  return 200
}

export const bodyForResult = (result: Router.ResolveResult): Html.Child =>
  result.output ?? Html.el("p", Html.children("Loom example route output is unavailable."))
