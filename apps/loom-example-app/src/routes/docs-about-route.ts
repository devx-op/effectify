import { Component, Html, View, Web } from "@effectify/loom"
import { Route } from "@effectify/loom-router"
import { routeIds, routePaths } from "./route-ids.js"

export const docsAboutRouteTitle = "Docs / About"

const docsAboutRoutePage = Component.make("docs-about-route-page").pipe(
  Component.view(() =>
    View.stack(
      Html.el("h1", Html.children("About this Loom example")),
      Html.el(
        "p",
        Html.children(
          "This example now demonstrates the vNext authoring path first: router outputs accept Component/View renderables, while Html stays available for compatibility and advanced seams.",
        ),
      ),
      Html.el(
        "p",
        Html.children(
          "What it does not try to fake yet: full SPA navigation, router-owned client transitions, or production styling polish.",
        ),
      ),
      Html.el(
        "p",
        Html.children(
          Html.el("a", Html.attr("href", routePaths.liveIsland), Html.children("Jump to the live-island counter demo")),
        ),
      ),
    ).pipe(Web.data("route-view", "docs-about"))
  ),
)

export const docsAboutRoute = Route.make({
  identifier: routeIds.docsAbout,
  path: routePaths.docsAbout,
  content: docsAboutRoutePage,
})
