import * as Effect from "effect/Effect"
import { Atom, AtomRegistry } from "effect/unstable/reactivity"
import { Component, View, Web } from "@effectify/loom"
import { ActionInput, Route, Router, Runtime } from "@effectify/loom-router"
import { counterRoutePath } from "./counter-route.js"
import {
  cloneInitialTodos,
  makeTodoService,
  type TodoCommand,
  type TodoItem,
  type TodoServiceApi,
} from "../todo-service.js"

export const todoRouteId = "todo"
export const todoRoutePath = "/todos"
export const todoRouteTitle = "Todo app"

type TodoRouteFailure = Readonly<{
  message: string
}>

type TodoRouteServices = Readonly<{
  todoService: TodoServiceApi
}>

type TodoLoaderState = Runtime.LoaderState<typeof todoPageRoute>
type TodoActionState = Runtime.ActionState<typeof todoPageRoute>

const remainingTodoCount = (todos: ReadonlyArray<TodoItem>): number => todos.filter((todo) => !todo.completed).length

const completedTodoCount = (todos: ReadonlyArray<TodoItem>): number => todos.filter((todo) => todo.completed).length

const hasCompletedTodos = (todos: ReadonlyArray<TodoItem>): boolean => todos.some((todo) => todo.completed)

const firstValue = (value: ActionInput.Value | undefined): string | undefined =>
  typeof value === "string" ? value : value?.[0]

const normalizeErrorMessage = (cause: unknown): string => cause instanceof Error ? cause.message : String(cause)

const todoActionDecoder = ActionInput.make<TodoCommand>((input) => {
  const intent = firstValue(input.intent)

  switch (intent) {
    case "create": {
      const title = firstValue(input.title)?.trim() ?? ""

      return title.length === 0
        ? ActionInput.fail("Todo title is required", input)
        : ActionInput.succeed({ intent, title })
    }
    case "toggle": {
      const id = Number(firstValue(input.id))

      return Number.isInteger(id)
        ? ActionInput.succeed({ intent, id })
        : ActionInput.fail("Todo id must be a whole number for toggle actions", input)
    }
    case "remove": {
      const id = Number(firstValue(input.id))

      return Number.isInteger(id)
        ? ActionInput.succeed({ intent, id })
        : ActionInput.fail("Todo id must be a whole number for remove actions", input)
    }
    case "clear-completed":
      return ActionInput.succeed({ intent })
    default:
      return ActionInput.fail("Todo action intent is required", input)
  }
})

const todoRegistry = AtomRegistry.make()

const withSharedRegistry = <ComponentType extends Component.Type<any, any, any, any, any, any, any>>(
  component: ComponentType,
): ComponentType => ({
  ...component,
  registry: todoRegistry,
})

const todoDraftWritable = Atom.make("")
const todoItemsWritable = Atom.make<Array<TodoItem>>([])
const todoLoaderStatusWritable = Atom.make<"idle" | "loading" | "loaded" | "revalidating" | "failure">("idle")
const todoActionStatusWritable = Atom.make<"idle" | "submitting" | "success" | "invalid-input" | "failure">("idle")
const todoFeedbackWritable = Atom.make<string | undefined>(undefined)

export const todoDraftAtom = todoDraftWritable
export const todoItemsAtom = todoItemsWritable
export const todoLoaderStatusAtom = todoLoaderStatusWritable
export const todoActionStatusAtom = todoActionStatusWritable
export const todoFeedbackAtom = todoFeedbackWritable

const todoPanel = Component.make("todo-panel").pipe(
  Component.children(),
  Component.view(({ children }) => View.vstack(children).pipe(Web.className("loom-example-card todo-panel"))),
)

const todoHero = withSharedRegistry(
  Component.make("todo-hero").pipe(
    Component.state({
      draft: todoDraftAtom,
      todos: todoItemsAtom,
      loaderStatus: todoLoaderStatusAtom,
    }),
    Component.children(),
    Component.view(({ state }) =>
      View.vstack(
        View.vstack(
          View.text("Example app only").pipe(Web.className("loom-example-eyebrow")),
          View.text("Loom vNext todo app").pipe(Web.as("h1"), Web.className("todo-title")),
          View.text(
            "This route now reads through a loader and writes through an action runtime so the example shows an honest data flow instead of mutating module state directly.",
          ).pipe(Web.className("todo-copy")),
        ).pipe(Web.className("loom-example-hero")),
        View.hstack(
          View.vstack(
            View.text("Loaded todos").pipe(Web.className("todo-kpi-label")),
            View.text(() => `${state.todos().length} tracked todos`).pipe(Web.className("todo-kpi-value")),
          ).pipe(Web.className("todo-kpi")),
          View.vstack(
            View.text("Loader status").pipe(Web.className("todo-kpi-label")),
            View.text(() => state.loaderStatus()).pipe(
              Web.className("todo-kpi-value"),
              Web.data("todo-runtime-status", "true"),
            ),
          ).pipe(Web.className("todo-kpi")),
          View.vstack(
            View.text("Draft sync").pipe(Web.className("todo-kpi-label")),
            View.text(() => state.draft().trim().length > 0 ? "Composer is holding input" : "Composer is empty").pipe(
              Web.className("todo-kpi-value"),
            ),
          ).pipe(Web.className("todo-kpi")),
          View.link("Back to counter", counterRoutePath).pipe(Web.className("outline secondary todo-link")),
        ).pipe(Web.className("todo-kpi-row")),
      ).pipe(Web.data("todo-hero", "true"))
    ),
  ),
)

const todoInsights = withSharedRegistry(
  Component.make("todo-insights").pipe(
    Component.state({
      actionStatus: todoActionStatusAtom,
      feedback: todoFeedbackAtom,
      todos: todoItemsAtom,
    }),
    Component.children(),
    Component.view(({ state }) =>
      Component.use(todoPanel, [
        View.text("Runtime snapshot").pipe(Web.as("h2"), Web.className("todo-section-title")),
        View.text(
          "The route loader owns the initial list, and every button funnels through the route action plus self-revalidation.",
        ).pipe(Web.className("todo-copy")),
        View.hstack(
          View.vstack(
            View.text("Open").pipe(Web.className("todo-stat-label")),
            View.text(() => `${remainingTodoCount(state.todos())}`).pipe(
              Web.className("todo-stat-value"),
              Web.data("todo-open-count", "true"),
            ),
          ).pipe(Web.className("todo-stat")),
          View.vstack(
            View.text("Completed").pipe(Web.className("todo-stat-label")),
            View.text(() => `${completedTodoCount(state.todos())}`).pipe(
              Web.className("todo-stat-value"),
              Web.data("todo-completed-count", "true"),
            ),
          ).pipe(Web.className("todo-stat")),
          View.vstack(
            View.text("Action status").pipe(Web.className("todo-stat-label")),
            View.text(() => state.actionStatus()).pipe(
              Web.className("todo-stat-value"),
              Web.data("todo-action-status", "true"),
            ),
          ).pipe(Web.className("todo-stat")),
        ).pipe(Web.className("todo-stat-grid")),
        View.if(
          () => state.feedback() !== undefined,
          View.text(() => state.feedback() ?? "").pipe(
            Web.className("todo-copy"),
            Web.data("todo-feedback", "true"),
          ),
          View.fragment(),
        ),
      ])
    ),
  ),
)

const todoComposer = withSharedRegistry(
  Component.make("todo-composer").pipe(
    Component.state({
      actionStatus: todoActionStatusAtom,
      draft: todoDraftAtom,
    }),
    Component.stateFactory(() => ({
      additions: Atom.make(0),
    })),
    Component.actions(({ model }) => ({
      submitDraft: async (titleInput?: string): Promise<void> => {
        const title = titleInput ?? model.draft.get()
        const result = await submitTodoRouteSubmission({
          intent: "create",
          title,
        })

        if (result.action._tag === "success") {
          model.draft.set("")
          model.additions.update((value: number) => value + 1)
        }
      },
      syncDraft: (value: string): void => {
        model.draft.set(value)
      },
    })),
    Component.children(),
    Component.view(({ state, actions }) =>
      Component.use(todoPanel, [
        View.text("Composer").pipe(Web.as("h2"), Web.className("todo-section-title")),
        View.text(
          "The Add button now submits normalized action input through the Loom runtime before the loader revalidates the list.",
        ).pipe(Web.className("todo-copy")),
        View.hstack(
          View.input().pipe(
            Web.className("todo-input"),
            Web.attr("placeholder", "What should we ship next?"),
            Web.attr("aria-label", "Todo title"),
            Web.data("todo-input", "true"),
            Web.value(() => state.draft()),
            Web.on("input", ({ currentTarget }) => {
              if (currentTarget instanceof HTMLInputElement) {
                actions.syncDraft(currentTarget.value)
              }
            }),
            Web.on("keydown", ({ event, currentTarget }) => {
              if (event instanceof KeyboardEvent && event.key === "Enter") {
                event.preventDefault()

                if (currentTarget instanceof HTMLInputElement) {
                  void actions.submitDraft(currentTarget.value)
                }
              }
            }),
          ),
          View.button("Add todo", () => actions.submitDraft()).pipe(
            Web.className("contrast"),
            Web.attr("disabled", () => state.actionStatus() === "submitting"),
            Web.data("todo-add-action", "true"),
          ),
        ).pipe(Web.className("todo-composer-row")),
        View.hstack(
          View.text("Every successful submit triggers a self-revalidation through the route loader.").pipe(
            Web.className("todo-copy"),
          ),
          View.text(() => `Added from this mounted composer: ${state.additions()}`).pipe(
            Web.className("todo-session-count"),
            Web.data("todo-session-count", "true"),
          ),
        ).pipe(Web.className("todo-composer-meta")),
      ])
    ),
  ),
)

const todoList = withSharedRegistry(
  Component.make("todo-list").pipe(
    Component.state({
      actionStatus: todoActionStatusAtom,
      todos: todoItemsAtom,
    }),
    Component.actions(() => ({
      clearCompleted: async (): Promise<void> => {
        await submitTodoRouteSubmission({ intent: "clear-completed" })
      },
      removeTodo: async (id: number): Promise<void> => {
        await submitTodoRouteSubmission({ intent: "remove", id: String(id) })
      },
      toggleTodo: async (id: number): Promise<void> => {
        await submitTodoRouteSubmission({ intent: "toggle", id: String(id) })
      },
    })),
    Component.children(),
    Component.view(({ state, actions }) =>
      Component.use(todoPanel, [
        View.hstack(
          View.vstack(
            View.text("Todo list").pipe(Web.as("h2"), Web.className("todo-section-title")),
            View.text(
              "Secondary buttons also dispatch through the same route action instead of mutating atoms in place.",
            ).pipe(
              Web.className("todo-copy"),
            ),
          ),
          View.button("Clear completed", () => actions.clearCompleted()).pipe(
            Web.className("outline secondary"),
            Web.attr("disabled", () => !hasCompletedTodos(state.todos()) || state.actionStatus() === "submitting"),
            Web.data("todo-clear-completed", "true"),
          ),
        ).pipe(Web.className("todo-list-header")),
        View.if(
          () => state.todos().length === 0,
          View.text("No todos left. Add another one from the composer above.").pipe(
            Web.className("todo-empty-state"),
            Web.data("todo-empty-state", "true"),
          ),
          View.vstack(
            View.for(() => state.todos(), {
              key: (todo) => todo.id,
              render: (todo) =>
                View.hstack(
                  View.button(todo.completed ? "Re-open" : "Done", () => actions.toggleTodo(todo.id)).pipe(
                    Web.className(todo.completed ? "outline secondary" : "secondary"),
                    Web.attr("disabled", () => state.actionStatus() === "submitting"),
                    Web.data("todo-toggle-id", `${todo.id}`),
                  ),
                  View.vstack(
                    View.text(todo.title).pipe(
                      Web.className(todo.completed ? "todo-item-title todo-item-title--completed" : "todo-item-title"),
                    ),
                    View.text(todo.completed ? "Completed task" : "Open task").pipe(Web.className("todo-item-status")),
                  ).pipe(Web.className("todo-item-copy")),
                  View.button("Remove", () => actions.removeTodo(todo.id)).pipe(
                    Web.className("outline contrast"),
                    Web.attr("disabled", () => state.actionStatus() === "submitting"),
                    Web.data("todo-remove-id", `${todo.id}`),
                  ),
                ).pipe(
                  Web.as("li"),
                  Web.className(todo.completed ? "todo-item todo-item--completed" : "todo-item"),
                  Web.data("todo-item-id", `${todo.id}`),
                ),
            }),
          ).pipe(Web.as("ul"), Web.className("todo-item-list"), Web.data("todo-list", "true")),
        ),
      ])
    ),
  ),
)

void [todoHero, todoInsights, todoComposer, todoList]

const todoNotes = Component.make("todo-notes").pipe(
  Component.children(),
  Component.view(() =>
    View.vstack(
      View.text(
        "View.input() + Web.value() still cover the composer, but the durable todo state now comes from loader/action runtime boundaries.",
      ).pipe(Web.className("compat-seam-note"), Web.data("todo-dx-caveat", "true")),
      View.text(
        "The point of this example is architecture: Effect-backed service first, Loom route runtime second, and UI atoms as the projected view state.",
      ).pipe(Web.className("dev-mode-note")),
    ).pipe(Web.className("loom-example-note-stack"))
  ),
)

const todoPageShell = Component.make("todo-page-shell").pipe(
  Component.children(),
  Component.view(({ children }) =>
    View.vstack(children).pipe(Web.className("loom-example-layout"), Web.data("route-view", "todo"))
  ),
)

export const todoRoute = withSharedRegistry(
  Component.make("todo-route").pipe(
    Component.view(() =>
      Component.use(todoPageShell, [
        Component.use(todoHero, View.fragment()),
        View.hstack(
          Component.use(todoInsights, View.fragment()),
          Component.use(todoComposer, View.fragment()),
        ).pipe(Web.className("todo-top-row")),
        Component.use(todoList, View.fragment()),
        Component.use(todoNotes, View.fragment()),
      ])
    ),
  ),
)

const todoBaseRoute: Route.Definition<typeof todoRoute, Route.Params, Route.Search, typeof todoRouteId> = Route.make({
  identifier: todoRouteId,
  path: todoRoutePath,
  content: todoRoute,
})

const todoLoaderDescriptor: Route.LoaderDescriptor<
  Route.Params,
  Route.Search,
  ReadonlyArray<TodoItem>,
  TodoRouteFailure,
  TodoRouteServices
> = {
  load: ({ services }): Promise<ReadonlyArray<TodoItem>> => Effect.runPromise(services.todoService.list()),
  mapError: (cause: unknown): TodoRouteFailure => ({ message: normalizeErrorMessage(cause) }),
}

const todoActionDescriptor: Route.ActionDescriptor<
  Route.Params,
  Route.Search,
  TodoCommand,
  { readonly intent: TodoCommand["intent"] },
  TodoRouteFailure,
  TodoRouteServices
> = {
  decodeInput: todoActionDecoder,
  handle: ({ input, services }): Promise<{ readonly intent: TodoCommand["intent"] }> =>
    Effect.runPromise(services.todoService.dispatch(input)),
  mapError: (cause: unknown): TodoRouteFailure => ({ message: normalizeErrorMessage(cause) }),
}

export const todoPageRoute: Route.Definition<
  typeof todoRoute,
  Route.Params,
  Route.Search,
  typeof todoRouteId,
  readonly [],
  typeof todoLoaderDescriptor,
  typeof todoActionDescriptor
> = Route.action(Route.loader(todoBaseRoute, todoLoaderDescriptor), todoActionDescriptor)

const todoServices = (): TodoRouteServices => ({
  todoService: makeTodoService(),
})

const todoRuntimeRouter = Router.make({
  routes: [todoPageRoute],
})

type TodoResolvedRoute =
  & Router.ResolveSuccess<Route.ParamsOf<typeof todoPageRoute>, Route.SearchOf<typeof todoPageRoute>>
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
      todoRegistry.set(todoItemsWritable, [...state.data])
      todoRegistry.set(todoLoaderStatusWritable, "loaded")
      todoRegistry.set(todoFeedbackWritable, undefined)
      return
    case "revalidating":
      todoRegistry.set(todoItemsWritable, [...state.data])
      todoRegistry.set(todoLoaderStatusWritable, "revalidating")
      return
    case "failure":
      todoRegistry.set(todoItemsWritable, [...(state.data ?? [])])
      todoRegistry.set(todoLoaderStatusWritable, "failure")
      todoRegistry.set(todoFeedbackWritable, state.error.message)
      return
    case "loading":
      todoRegistry.set(todoLoaderStatusWritable, "loading")
      return
    case "idle":
      todoRegistry.set(todoLoaderStatusWritable, "idle")
  }
}

const syncTodoActionState = (state: TodoActionState): void => {
  switch (state._tag) {
    case "success":
      todoRegistry.set(todoActionStatusWritable, "success")
      todoRegistry.set(todoFeedbackWritable, `Action '${state.result.intent}' completed and revalidated.`)
      return
    case "failure":
      todoRegistry.set(todoActionStatusWritable, "failure")
      todoRegistry.set(todoFeedbackWritable, state.error.message)
      return
    case "invalid-input":
      todoRegistry.set(todoActionStatusWritable, "invalid-input")
      todoRegistry.set(todoFeedbackWritable, state.issues[0].message)
      return
    case "submitting":
      todoRegistry.set(todoActionStatusWritable, "submitting")
      return
    case "idle":
      todoRegistry.set(todoActionStatusWritable, "idle")
      todoRegistry.set(todoFeedbackWritable, undefined)
  }
}

export interface TodoRouteRuntime {
  readonly load: (input?: string | URL) => Promise<TodoLoaderState>
  readonly reset: () => void
  readonly submit: (
    options: { readonly input?: string | URL; readonly submission: ActionInput.Submission },
  ) => Promise<{
    readonly action: TodoActionState
    readonly loader?: TodoLoaderState
  }>
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

export const loadTodoRouteState = async (input: string | URL = todoRoutePath): Promise<TodoLoaderState> => {
  todoRegistry.set(todoLoaderStatusWritable, "loading")
  const loaded = await todoRouteRuntime.load(input)

  syncTodoLoaderState(loaded)
  return loaded
}

export const submitTodoRouteSubmission = async (
  submission: ActionInput.Submission,
): Promise<{
  readonly action: TodoActionState
  readonly loader?: TodoLoaderState
}> => {
  todoRegistry.set(todoActionStatusWritable, "submitting")

  const result = await todoRouteRuntime.submit({ submission })

  syncTodoActionState(result.action)

  if (result.loader !== undefined) {
    syncTodoLoaderState(result.loader)
  }

  return result
}

export const resetTodoExampleState = (): void => {
  todoRouteRuntime.reset()
  todoRegistry.set(todoDraftWritable, "")
  todoRegistry.set(todoItemsWritable, cloneInitialTodos())
  todoRegistry.set(todoLoaderStatusWritable, "idle")
  todoRegistry.set(todoActionStatusWritable, "idle")
  todoRegistry.set(todoFeedbackWritable, undefined)
}
