import type * as Loom from "@effectify/loom"
import { Component, Html, Slot, View, Web } from "@effectify/loom"
import { routePaths } from "./routes/route-ids.js"

const appShell = Component.make("app-shell").pipe(
  Component.slots({ default: Slot.required() }),
  Component.view(({ slots }) =>
    View.stack(
      View.header(
        Html.fragment(
          Html.el("p", Html.children("Loom Example App")),
          Html.el(
            "nav",
            Html.attr("aria-label", "Primary"),
            Html.children(
              Html.el("a", Html.attr("href", routePaths.home), Html.children("Home")),
              Html.el("span", Html.children(" · ")),
              Html.el("a", Html.attr("href", routePaths.docsAbout), Html.children("Docs / About")),
              Html.el("span", Html.children(" · ")),
              Html.el("a", Html.attr("href", routePaths.liveIsland), Html.children("Live Island")),
            ),
          ),
        ),
      ),
      View.main(slots.default).pipe(Web.data("app-main", "true")),
      Html.el("footer", Html.children("Batch 2 demo: routed SSR + one resumable live island.")),
    ).pipe(Web.data("app-shell", "loom-example-app"))
  ),
)

export const renderAppShell = (child: Loom.View.Child): Loom.View.Child =>
  Component.use(appShell, undefined, { default: child })
