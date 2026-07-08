import { Atom, AtomRegistry } from "effect/unstable/reactivity"
import { cloneInitialTodos, type TodoItem } from "../todo-service.js"

export type TodoLoaderStatus = "idle" | "loading" | "loaded" | "revalidating" | "failure"

export type TodoActionStatus = "idle" | "submitting" | "success" | "invalid-input" | "failure"

export const todoRegistry = AtomRegistry.make()

export const todoDraftAtom = Atom.make("")
export const todoItemsAtom = Atom.make<Array<TodoItem>>([])
export const todoLoaderStatusAtom = Atom.make<TodoLoaderStatus>("idle")
export const todoActionStatusAtom = Atom.make<TodoActionStatus>("idle")
export const todoFeedbackAtom = Atom.make<string | undefined>(undefined)

export const setTodoItems = (items: ReadonlyArray<TodoItem>): void => {
  todoRegistry.set(todoItemsAtom, [...items])
}

export const setTodoLoaderStatus = (status: TodoLoaderStatus): void => {
  todoRegistry.set(todoLoaderStatusAtom, status)
}

export const setTodoActionStatus = (status: TodoActionStatus): void => {
  todoRegistry.set(todoActionStatusAtom, status)
}

export const setTodoFeedback = (feedback: string | undefined): void => {
  todoRegistry.set(todoFeedbackAtom, feedback)
}

export const resetTodoRouteViewState = (): void => {
  todoRegistry.set(todoDraftAtom, "")
  setTodoItems(cloneInitialTodos())
  setTodoLoaderStatus("idle")
  setTodoActionStatus("idle")
  setTodoFeedback(undefined)
}
