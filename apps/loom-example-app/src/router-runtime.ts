import * as Effect from "effect/Effect"
import { Router, Runtime } from "@effectify/loom-router"
import { todoPageRoute, todoRouteId, todoRoutePath } from "./router.js"
import {
  resetTodoRouteViewState,
  setTodoActionStatus,
  setTodoFeedback,
  setTodoItems,
  setTodoLoaderStatus,
} from "./routes/todo-route-state.js"
import { makeTodoService, type TodoItem, type TodoServiceApi } from "./todo-service.js"

type TodoRouteServices = Readonly<{
  todoService: TodoServiceApi
}>

type TodoLoaderState = Runtime.LoaderState<typeof todoPageRoute>
type TodoActionState = Runtime.ActionState<typeof todoPageRoute>

export interface TodoRouteRuntime {
  readonly load: (input?: string | URL) => Promise<TodoLoaderState>
  readonly reset: () => void
  readonly submit: (
    options: { readonly input?: string | URL; readonly submission: Runtime.Submission },
  ) => Promise<{
    readonly action: TodoActionState
    readonly loader?: TodoLoaderState
  }>
}

const todoServices = (): TodoRouteServices => ({
  todoService: makeTodoService(),
})

const todoRuntimeRouter = Router.make({
  routes: [todoPageRoute],
})

type TodoResolvedRoute =
  & Router.ResolveSuccess
  & {
    readonly route: typeof todoPageRoute
  }

const isTodoResolvedRoute = (value: Router.ResolveResult): value is TodoResolvedRoute =>
  Router.isResolveSuccess(value) && value.route.identifier === todoRouteId

const resolveTodoRoute = (input: string | URL = todoRoutePath): TodoResolvedRoute => {
  const resolved = Router.resolve(todoRuntimeRouter, input)

  if (!isTodoResolvedRoute(resolved)) {
    throw new Error(`Expected '${todoRoutePath}' to resolve successfully for the Loom todo runtime`)
  }

  return resolved
}

const staleTodoData = (state: TodoLoaderState | undefined): ReadonlyArray<TodoItem> | undefined => {
  if (state === undefined) {
    return undefined
  }

  switch (state._tag) {
    case "success":
    case "revalidating":
      return state.data
    case "failure":
      return state.data
    default:
      return undefined
  }
}

const syncTodoLoaderState = (state: TodoLoaderState): void => {
  switch (state._tag) {
    case "success":
      setTodoItems(state.data)
      setTodoLoaderStatus("loaded")
      setTodoFeedback(undefined)
      return
    case "revalidating":
      setTodoItems(state.data)
      setTodoLoaderStatus("revalidating")
      return
    case "failure":
      setTodoItems(state.data ?? [])
      setTodoLoaderStatus("failure")
      setTodoFeedback(state.error.message)
      return
    case "loading":
      setTodoLoaderStatus("loading")
      return
    case "idle":
      setTodoLoaderStatus("idle")
  }
}

const syncTodoActionState = (state: TodoActionState): void => {
  switch (state._tag) {
    case "success":
      setTodoActionStatus("success")
      setTodoFeedback(`Action '${state.result.intent}' completed and revalidated.`)
      return
    case "failure":
      setTodoActionStatus("failure")
      setTodoFeedback(state.error.message)
      return
    case "invalid-input":
      setTodoActionStatus("invalid-input")
      setTodoFeedback(state.issues[0].message)
      return
    case "submitting":
      setTodoActionStatus("submitting")
      return
    case "idle":
      setTodoActionStatus("idle")
      setTodoFeedback(undefined)
  }
}

export const createTodoRouteRuntime = (services: TodoRouteServices = todoServices()): TodoRouteRuntime => {
  let latestLoaderState: TodoLoaderState | undefined

  return {
    load: async (input = todoRoutePath) => {
      const loaded = await Runtime.load<typeof todoPageRoute>({
        resolved: resolveTodoRoute(input),
        services,
      })

      latestLoaderState = loaded

      return loaded
    },
    reset: () => {
      Effect.runSync(services.todoService.reset())
      latestLoaderState = undefined
    },
    submit: async ({ input = todoRoutePath, submission }) => {
      const resolved = resolveTodoRoute(input)
      const action = await Runtime.submit<typeof todoPageRoute>({
        resolved,
        services,
        submission,
      })

      if (action._tag !== "success") {
        return { action }
      }

      const previous = staleTodoData(latestLoaderState)
      const loader = previous === undefined
        ? await Runtime.load<typeof todoPageRoute>({ resolved, services })
        : await Runtime.revalidate<typeof todoPageRoute>({ previous, resolved, services })

      latestLoaderState = loader

      return {
        action,
        loader,
      }
    },
  }
}

export const todoRouteRuntime = createTodoRouteRuntime()

export const prepareRouteRuntime = async (input: URL): Promise<void> => {
  if (input.pathname === todoRoutePath) {
    await loadTodoRouteState(input)
  }
}

export const loadTodoRouteState = async (input: string | URL = todoRoutePath): Promise<TodoLoaderState> => {
  setTodoLoaderStatus("loading")
  const loaded = await todoRouteRuntime.load(input)

  syncTodoLoaderState(loaded)
  return loaded
}

export const submitTodoRuntimeAction = async (
  submission: Runtime.Submission,
): Promise<{
  readonly action: TodoActionState
  readonly loader?: TodoLoaderState
}> => {
  setTodoActionStatus("submitting")

  const result = await todoRouteRuntime.submit({ submission })

  syncTodoActionState(result.action)

  if (result.loader !== undefined) {
    syncTodoLoaderState(result.loader)
  }

  return result
}

export const resetTodoExampleState = (): void => {
  todoRouteRuntime.reset()
  resetTodoRouteViewState()
}
