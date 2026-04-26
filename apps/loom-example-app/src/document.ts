import type * as Loom from "@effectify/loom"
import { Html } from "@effectify/loom"
import { appPayloadElementId, appRootId } from "./app-config.js"

export interface DocumentOptions {
  readonly title: string
  readonly body: Loom.View.Child
}

export const createDocument = (options: DocumentOptions): Loom.View.Child =>
  Html.el(
    "html",
    Html.attr("lang", "en"),
    Html.children(
      Html.el(
        "head",
        Html.children(
          Html.el("meta", Html.attr("charset", "utf-8")),
          Html.el("meta", Html.attr("name", "viewport"), Html.attr("content", "width=device-width, initial-scale=1")),
          Html.el("title", Html.children(`Loom Example App · ${options.title}`)),
        ),
      ),
      Html.el(
        "body",
        Html.children(
          Html.el("div", Html.attr("id", appRootId), Html.children(options.body)),
          Html.el("script", Html.attr("type", "application/json"), Html.attr("id", appPayloadElementId)),
          Html.el("script", Html.attr("type", "module"), Html.attr("src", "/src/entry-browser.ts")),
        ),
      ),
    ),
  )
