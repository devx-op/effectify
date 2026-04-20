import type * as Loom from "@effectify/loom"
import { Link, Navigation, Router } from "@effectify/loom-router"
import { appRouter, bodyForResult, resolveAppRequest } from "../src/router.js"
import { goToDocsAbout, goToLiveIsland, hrefToDocsAbout, hrefToHome, hrefToLiveIsland } from "../src/navigation.js"
import { routeIds } from "../src/routes/route-ids.js"

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
  ? true
  : false
type Expect<Value extends true> = Value

const navigation = Navigation.memory("https://effectify.dev/")
const homeHref = hrefToHome()
const docsAboutHref = hrefToDocsAbout()
const liveIslandHref = hrefToLiveIsland()
const docsAboutRouterHref = Router.href(appRouter, routeIds.docsAbout)
const routerHref = Router.href(appRouter, routeIds.liveIsland)
const homeBody: Loom.View.Child = bodyForResult(resolveAppRequest("https://effectify.dev/"))

goToDocsAbout(navigation)
goToLiveIsland(navigation)
Link.navigate(navigation, docsAboutRouterHref)
Link.navigate(navigation, routerHref)

type HomeHrefContract = Expect<Equal<typeof homeHref, string>>
type HomeBodyContract = Expect<Equal<typeof homeBody, Loom.View.Child>>
type DocsAboutHrefContract = Expect<Equal<typeof docsAboutHref, string>>
type LiveIslandHrefContract = Expect<Equal<typeof liveIslandHref, string>>
type DocsAboutRouterHrefContract = Expect<Equal<typeof docsAboutRouterHref, string>>
type RouterHrefContract = Expect<Equal<typeof routerHref, string>>

// @ts-expect-error unknown route identifiers must fail before runtime
Router.href(appRouter, "settings")

export const typecheckSmoke = {
  appRouter,
  docsAboutHref,
  docsAboutRouterHref,
  homeBody,
  homeHref,
  liveIslandHref,
  navigation,
  routeIds,
  routerHref,
}

export type {
  DocsAboutHrefContract,
  DocsAboutRouterHrefContract,
  HomeBodyContract,
  HomeHrefContract,
  LiveIslandHrefContract,
  RouterHrefContract,
}
