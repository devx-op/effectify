import { Component, Html, View, Web } from "@effectify/loom"
import { Route } from "@effectify/loom-router"
import { renderLiveIslandDemo } from "../live-island-demo.js"
import { routeIds, routePaths } from "./route-ids.js"

export const liveIslandRouteTitle = "Live Island"

const liveIslandRoutePage = Component.make("live-island-route-page").pipe(
  Component.view(() =>
    View.stack(
      Html.el("h1", Html.children("Live island demo")),
      Html.el(
        "p",
        Html.children(
          "The page shell is authored through Component + View, while the island itself still uses the Html + Hydration compatibility seam because that is the correct boundary today.",
        ),
      ),
      renderLiveIslandDemo(),
    ).pipe(Web.data("route-view", "live-island"))
  ),
)

export const liveIslandRoute = Route.make({
  identifier: routeIds.liveIsland,
  path: routePaths.liveIsland,
  content: liveIslandRoutePage,
})
