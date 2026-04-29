import type * as Loom from "@effectify/loom"
import { Router } from "@effectify/loom-router"
import { CounterRoute } from "../src/routes/counter-route.js"
import {
  appRouter,
  bodyForResult,
  prepareAppRequest,
  resetExampleState,
  resolveAppRequest,
  todoPageRoute,
  todoRouteId,
} from "../src/router.js"
import { counterRouteId } from "../src/routes/counter-route.js"
import { createTodoRouteRuntime, submitTodoRoute } from "../src/routes/todo-route.js"

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
  ? true
  : false
type Expect<Value extends true> = Value

const homeHref = Router.href(appRouter, counterRouteId)
const todoHref = Router.href(appRouter, todoPageRoute)
const homeBody: Loom.View.Child = bodyForResult(resolveAppRequest("https://effectify.dev/"))
const todoBody: Loom.View.Child = bodyForResult(resolveAppRequest("https://effectify.dev/todos"))
const counterComponent: Loom.Component.Component<any, any, any, any, any, any, any> = CounterRoute
const todoRuntime = createTodoRouteRuntime()
const prepareRequestPromise = prepareAppRequest(new URL("https://effectify.dev/todos"))
const submitTodoPromise = submitTodoRoute({ intent: "clear-completed" })
const resetResult = resetExampleState()

type HomeHrefContract = Expect<Equal<typeof homeHref, string>>
type TodoHrefContract = Expect<Equal<typeof todoHref, string>>
type HomeBodyContract = Expect<Equal<typeof homeBody, Loom.View.Child>>
type TodoBodyContract = Expect<Equal<typeof todoBody, Loom.View.Child>>
type TodoRuntimeContract = Expect<Equal<typeof todoRuntime.reset, () => void>>
type PrepareRequestContract = Expect<Equal<typeof prepareRequestPromise, Promise<void>>>
type SubmitTodoContract = Expect<
  Equal<typeof submitTodoPromise, Promise<{ readonly action: { readonly _tag: string }; readonly loader?: unknown }>>
>
type ResetContract = Expect<Equal<typeof resetResult, void>>

// @ts-expect-error unknown route identifiers must fail before runtime
Router.href(appRouter, "settings")

export const typecheckSmoke = {
  appRouter,
  counterComponent,
  counterRouteId,
  homeBody,
  homeHref,
  prepareRequestPromise,
  resetResult,
  submitTodoPromise,
  todoBody,
  todoHref,
  todoRuntime,
  todoRouteId,
}

export type {
  HomeBodyContract,
  HomeHrefContract,
  PrepareRequestContract,
  ResetContract,
  SubmitTodoContract,
  TodoBodyContract,
  TodoHrefContract,
  TodoRuntimeContract,
}
