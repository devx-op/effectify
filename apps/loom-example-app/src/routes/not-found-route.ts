import { Html } from "@effectify/loom"
import { Fallback, type Router } from "@effectify/loom-router"
import { routePaths } from "./route-ids.js"

export const notFoundRouteTitle = "Not Found"

export const notFoundFallback = Fallback.make((context: Router.Context) =>
  Html.fragment(
    Html.el("h1", Html.children("Page not found")),
    Html.el("p", Html.children(`No Loom example route matches ${context.pathname}.`)),
    Html.el(
      "p",
      Html.children(Html.el("a", Html.attr("href", routePaths.home), Html.children("Return to the home route"))),
    ),
  )
)
