import { Html } from "@effectify/loom"
import { hrefToDocsAbout, hrefToHome, hrefToLiveIsland } from "./navigation.js"

export const renderAppShell = (child: Html.Child): Html.Child =>
  Html.el(
    "div",
    Html.attr("data-app-shell", "loom-example-app"),
    Html.children(
      Html.el(
        "header",
        Html.children(
          Html.el("p", Html.children("Loom Example App")),
          Html.el(
            "nav",
            Html.attr("aria-label", "Primary"),
            Html.children(
              Html.el("a", Html.attr("href", hrefToHome()), Html.children("Home")),
              Html.el("span", Html.children(" · ")),
              Html.el("a", Html.attr("href", hrefToDocsAbout()), Html.children("Docs / About")),
              Html.el("span", Html.children(" · ")),
              Html.el("a", Html.attr("href", hrefToLiveIsland()), Html.children("Live Island")),
            ),
          ),
        ),
      ),
      Html.el("main", Html.attr("data-app-main", "true"), Html.children(child)),
      Html.el("footer", Html.children("Batch 2 demo: routed SSR + one resumable live island.")),
    ),
  )
