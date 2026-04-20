import { Html } from "@effectify/loom"
import { Route } from "@effectify/loom-router"
import { routeIds, routePaths } from "./route-ids.js"

export const homeRouteTitle = "Home"

export const homeRoute = Route.make({
  identifier: routeIds.home,
  path: routePaths.home,
  content: Html.fragment(
    Html.el("h1", Html.children("Loom Example App")),
    Html.el(
      "p",
      Html.children(
        "SSR-first example routes for Loom, with one real selective-hydration island instead of placeholder copy.",
      ),
    ),
    Html.el(
      "ul",
      Html.children(
        Html.el(
          "li",
          Html.children(
            Html.el("a", Html.attr("href", routePaths.docsAbout), Html.children("Read the docs/about route")),
          ),
        ),
        Html.el(
          "li",
          Html.children(
            Html.el("a", Html.attr("href", routePaths.liveIsland), Html.children("Open the live-island demo")),
          ),
        ),
      ),
    ),
  ),
})
