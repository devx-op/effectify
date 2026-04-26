import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import { Route } from "@effectify/loom-router"
import { TodoRoute } from "./todo-route/todo-route-component.js"
import { todoRegistry } from "./todo-route-state.js"
import {
  TodoCommandResultSchema,
  TodoCommandSchema,
  TodoItemsSchema,
  TodoRouteErrorSchema,
  type TodoRouteServices,
} from "./todo-route/todo-route-shared.js"

export const component = Object.assign(TodoRoute, { registry: todoRegistry })

export const loader = pipe(
  Effect.fn(function*({ services }: { readonly services: TodoRouteServices }) {
    return yield* services.todoService.list()
  }),
  Route.loader({
    output: TodoItemsSchema,
  }),
)

export const action = pipe(
  Effect.fn(function*({
    input,
    services,
  }: { readonly input: typeof TodoCommandSchema.Type; readonly services: TodoRouteServices }) {
    return yield* services.todoService.dispatch(input)
  }),
  Route.action({
    input: TodoCommandSchema,
    output: TodoCommandResultSchema,
    error: TodoRouteErrorSchema,
  }),
)
