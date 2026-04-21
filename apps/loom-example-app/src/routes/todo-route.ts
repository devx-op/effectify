import { Atom, AtomRegistry } from "effect/unstable/reactivity"
import { Component, View, Web } from "@effectify/loom"
import { Route } from "@effectify/loom-router"
import { counterRoutePath } from "./counter-route.js"

export interface TodoItem {
  readonly id: number
  readonly title: string
  readonly completed: boolean
}

export const todoRouteId = "todo"
export const todoRoutePath = "/todos"
export const todoRouteTitle = "Todo app"

const initialTodoItems: ReadonlyArray<TodoItem> = [
  { id: 1, title: "Sketch the shared Atom shape", completed: true },
  { id: 2, title: "Wire the composer to shared state", completed: false },
  { id: 3, title: "Show composition through child components", completed: false },
]

const cloneInitialTodos = (): Array<TodoItem> => initialTodoItems.map((todo) => ({ ...todo }))

const remainingTodoCount = (todos: ReadonlyArray<TodoItem>): number => todos.filter((todo) => !todo.completed).length

const completedTodoCount = (todos: ReadonlyArray<TodoItem>): number => todos.filter((todo) => todo.completed).length

const hasCompletedTodos = (todos: ReadonlyArray<TodoItem>): boolean => todos.some((todo) => todo.completed)

const todoRegistry = AtomRegistry.make()

const withSharedRegistry = <ComponentType extends Component.Type<any, any, any, any, any, any, any>>(
  component: ComponentType,
): ComponentType => ({
  ...component,
  registry: todoRegistry,
})

const todoDraftWritable = Atom.make("")
const todoItemsWritable = Atom.make<Array<TodoItem>>(cloneInitialTodos())
const todoNextIdWritable = Atom.make(initialTodoItems.length + 1)

export const todoDraftAtom = todoDraftWritable.pipe(Atom.keepAlive)
export const todoItemsAtom = todoItemsWritable.pipe(Atom.keepAlive)
export const todoNextIdAtom = todoNextIdWritable.pipe(Atom.keepAlive)

export const resetTodoExampleState = (): void => {
  todoRegistry.set(todoDraftWritable, "")
  todoRegistry.set(todoItemsWritable, cloneInitialTodos())
  todoRegistry.set(todoNextIdWritable, initialTodoItems.length + 1)
}

const todoPanel = Component.make("todo-panel").pipe(
  Component.children(),
  Component.view(({ children }) => View.vstack(children).pipe(Web.className("loom-example-card todo-panel"))),
)

const todoHero = withSharedRegistry(
  Component.make("todo-hero").pipe(
    Component.state({
      draft: todoDraftAtom,
      todos: todoItemsAtom,
    }),
    Component.children(),
    Component.view(({ state }) =>
      View.vstack(
        View.vstack(
          View.text("Example app only").pipe(Web.className("loom-example-eyebrow")),
          View.text("Loom vNext todo app").pipe(Web.as("h1"), Web.className("todo-title")),
          View.text(
            "This page keeps the atoms outside the components, then composes the UI from focused children-based pieces so the current vNext DX looks like a real feature instead of a toy demo.",
          ).pipe(Web.className("todo-copy")),
        ).pipe(Web.className("loom-example-hero")),
        View.hstack(
          View.vstack(
            View.text("Shared atoms").pipe(Web.className("todo-kpi-label")),
            View.text(() => `${state.todos().length} tracked todos`).pipe(Web.className("todo-kpi-value")),
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
      draft: todoDraftAtom,
      todos: todoItemsAtom,
    }),
    Component.children(),
    Component.view(({ state }) =>
      Component.use(todoPanel, [
        View.text("Shared state snapshot").pipe(Web.as("h2"), Web.className("todo-section-title")),
        View.text(
          "The header, composer, and list all read the same module-scoped atoms through Component.state(...).",
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
            View.text("Draft length").pipe(Web.className("todo-stat-label")),
            View.text(() => `${state.draft().trim().length}`).pipe(Web.className("todo-stat-value")),
          ).pipe(Web.className("todo-stat")),
        ).pipe(Web.className("todo-stat-grid")),
      ])
    ),
  ),
)

const todoComposer = withSharedRegistry(
  Component.make("todo-composer").pipe(
    Component.state({
      draft: todoDraftAtom,
      todos: todoItemsAtom,
      nextId: todoNextIdAtom,
    }),
    Component.stateFactory(() => ({
      additions: Atom.make(0),
    })),
    Component.actions(({ model }) => ({
      addTodo: (titleInput?: string): boolean => {
        const title = (titleInput ?? model.draft.get()).trim()

        if (title.length === 0) {
          return false
        }

        const identifier = model.nextId.get()

        model.todos.update((current: Array<TodoItem>) => [...current, { id: identifier, title, completed: false }])
        model.draft.set("")
        model.nextId.set(identifier + 1)
        model.additions.update((value: number) => value + 1)
        return true
      },
      syncDraft: (value: string): void => {
        model.draft.set(value)
      },
    })),
    Component.children(),
    Component.view(({ state, actions }) => {
      return Component.use(todoPanel, [
        View.text("Composer").pipe(Web.as("h2"), Web.className("todo-section-title")),
        View.text(
          "View.input() + Web.value() now keep the composer declarative while the shared atoms still drive the workflow.",
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
                  actions.addTodo(currentTarget.value)
                }
              }
            }),
          ),
          View.button("Add todo", () => actions.addTodo()).pipe(
            Web.className("contrast"),
            Web.data("todo-add-action", "true"),
          ),
        ).pipe(Web.className("todo-composer-row")),
        View.hstack(
          View.text(() => `${state.todos().length} todos are shared across the route right now.`).pipe(
            Web.className("todo-copy"),
          ),
          View.text(() => `Added from this mounted composer: ${state.additions()}`).pipe(
            Web.className("todo-session-count"),
            Web.data("todo-session-count", "true"),
          ),
        ).pipe(Web.className("todo-composer-meta")),
      ])
    }),
  ),
)

const todoList = withSharedRegistry(
  Component.make("todo-list").pipe(
    Component.state({
      todos: todoItemsAtom,
    }),
    Component.actions(({ model }) => ({
      clearCompleted: (): void => {
        model.todos.update((current: Array<TodoItem>) => current.filter((todo) => !todo.completed))
      },
      removeTodo: (id: number): void => {
        model.todos.update((current: Array<TodoItem>) => current.filter((todo) => todo.id !== id))
      },
      toggleTodo: (id: number): void => {
        model.todos.update((current: Array<TodoItem>) =>
          current.map((todo) => todo.id === id ? { ...todo, completed: !todo.completed } : todo)
        )
      },
    })),
    Component.children(),
    Component.view(({ state, actions }) =>
      Component.use(todoPanel, [
        View.hstack(
          View.vstack(
            View.text("Todo list").pipe(Web.as("h2"), Web.className("todo-section-title")),
            View.text("Buttons dispatch actions against the shared atoms, so every section stays synchronized.").pipe(
              Web.className("todo-copy"),
            ),
          ),
          View.button("Clear completed", actions.clearCompleted).pipe(
            Web.className("outline secondary"),
            Web.attr("disabled", () => !hasCompletedTodos(state.todos())),
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
        "View.input() + Web.value() now cover the todo composer, while checkbox/radio/select semantics stay intentionally deferred for the next Loom slice.",
      ).pipe(Web.className("compat-seam-note"), Web.data("todo-dx-caveat", "true")),
      View.text(
        "The important part is still the architecture: shared Atoms live outside components, and composition happens through focused Loom components instead of framework-specific wrappers.",
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

export const todoPageRoute = Route.make({
  identifier: todoRouteId,
  path: todoRoutePath,
  content: todoRoute,
})
