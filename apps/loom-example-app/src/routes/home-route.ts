import { Component, Html, View, Web } from "@effectify/loom"
import { Route } from "@effectify/loom-router"
import { routeIds, routePaths } from "./route-ids.js"

export const homeRouteTitle = "Home"

const homeRoutePage = Component.make("home-route-page").pipe(
  Component.view(() =>
    View.stack(
      Html.el("h1", Html.children("Loom Example App")),
      Html.el(
        "p",
        Html.children(
          "Primary route authoring now leans on Component + View while keeping Html as the compatibility seam for gaps like links and document-level tags.",
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
    ).pipe(Web.data("route-view", "home"))
  ),
)

export const homeRoute = Route.make({
  identifier: routeIds.home,
  path: routePaths.home,
  content: homeRoutePage,
})
