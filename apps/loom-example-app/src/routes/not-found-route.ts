import type * as Loom from "@effectify/loom"
import { Html, View, Web } from "@effectify/loom"
import { Fallback, type Router } from "@effectify/loom-router"
import { routePaths } from "./route-ids.js"

export const notFoundRouteTitle = "Not Found"

const renderNotFoundPage = (pathname: string): Loom.View.Child =>
  View.stack(
    Html.el("h1", Html.children("Page not found")),
    Html.el("p", Html.children(`No Loom example route matches ${pathname}.`)),
    Html.el(
      "p",
      Html.children(Html.el("a", Html.attr("href", routePaths.home), Html.children("Return to the home route"))),
    ),
  ).pipe(Web.data("route-view", "not-found"))

export const notFoundFallback = Fallback.make((context: Router.Context) => renderNotFoundPage(context.pathname))
