import { loadTodoRouteState, submitTodoRouteSubmission, todoRoutePath } from "./routes/todo-route.js"

export const prepareRouteRuntime = async (input: URL): Promise<void> => {
  if (input.pathname === todoRoutePath) {
    await loadTodoRouteState(input)
  }
}

export const submitTodoRuntimeAction = submitTodoRouteSubmission
