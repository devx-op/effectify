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

export default Object.assign(TodoRoute, { registry: todoRegistry })

const todoLoaderOptions = {
  output: TodoItemsSchema,
} as const

export const loader = Route.loader({
  ...todoLoaderOptions,
  load: ({ services }: Route.ModuleLoaderContext<typeof todoLoaderOptions, TodoRouteServices>) =>
    services.todoService.list(),
})

const todoActionOptions = {
  input: TodoCommandSchema,
  output: TodoCommandResultSchema,
  error: TodoRouteErrorSchema,
} as const

export const action = Route.action({
  ...todoActionOptions,
  handle: ({
    input,
    services,
  }: Route.ModuleActionContext<typeof todoActionOptions, TodoRouteServices>) => services.todoService.dispatch(input),
})
