import { Html } from "@effectify/loom"
import { Route } from "@effectify/loom-router"
import { routeIds, routePaths } from "./route-ids.js"

export const docsAboutRouteTitle = "Docs / About"

export const docsAboutRoute = Route.make({
  identifier: routeIds.docsAbout,
  path: routePaths.docsAbout,
  content: Html.fragment(
    Html.el("h1", Html.children("About this Loom example")),
    Html.el(
      "p",
      Html.children(
        "This example stays deliberately small: routed SSR output, typed navigation helpers, and one resumable live island wired through the current Loom runtime seams.",
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
  ),
})
