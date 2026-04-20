import { Link, type Navigation, Router } from "@effectify/loom-router"
import { appRouter } from "./router.js"
import { routeIds } from "./routes/route-ids.js"

const toRelativeHref = (href: string): string => {
  const url = new URL(href)

  return `${url.pathname}${url.search}${url.hash}`
}

export const hrefToHome = (): string => toRelativeHref(Router.href(appRouter, routeIds.home))

export const hrefToDocsAbout = (): string => toRelativeHref(Router.href(appRouter, routeIds.docsAbout))

export const hrefToLiveIsland = (): string => toRelativeHref(Router.href(appRouter, routeIds.liveIsland))

export const goToDocsAbout = (navigation: Navigation.HistoryAdapter): void => {
  Link.navigate(navigation, hrefToDocsAbout())
}

export const goToLiveIsland = (navigation: Navigation.HistoryAdapter): void => {
  Link.navigate(navigation, hrefToLiveIsland())
}
