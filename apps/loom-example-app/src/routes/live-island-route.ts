import { Html } from "@effectify/loom"
import { Route } from "@effectify/loom-router"
import { renderLiveIslandDemo } from "../live-island-demo.js"
import { routeIds, routePaths } from "./route-ids.js"

export const liveIslandRouteTitle = "Live Island"

export const liveIslandRoute = Route.make({
  identifier: routeIds.liveIsland,
  path: routePaths.liveIsland,
  content: Html.fragment(
    Html.el("h1", Html.children("Live island demo")),
    Html.el(
      "p",
      Html.children(
        "The counter state is server-rendered, resumed on the client, and updated through a local executable registry plus dehydrated Atom state.",
      ),
    ),
    renderLiveIslandDemo(),
  ),
})
