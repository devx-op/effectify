import type * as Loom from "@effectify/loom"
import { Router } from "@effectify/loom-router"
import { appRouter, bodyForResult, resolveAppRequest } from "../src/router.js"
import { counterRouteId } from "../src/routes/counter-route.js"

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
  ? true
  : false
type Expect<Value extends true> = Value

const homeHref = Router.href(appRouter, counterRouteId)
const homeBody: Loom.View.Child = bodyForResult(resolveAppRequest("https://effectify.dev/"))

type HomeHrefContract = Expect<Equal<typeof homeHref, string>>
type HomeBodyContract = Expect<Equal<typeof homeBody, Loom.View.Child>>

// @ts-expect-error unknown route identifiers must fail before runtime
Router.href(appRouter, "settings")

export const typecheckSmoke = {
  appRouter,
  counterRouteId,
  homeBody,
  homeHref,
}

export type { HomeBodyContract, HomeHrefContract }
