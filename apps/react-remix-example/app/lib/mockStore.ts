export type TodoStatus = "PENDING" | "COMPLETED"

export type Todo = {
  id: string
  title: string
  content: string
  status: TodoStatus
  createdAt: string
}

// Module-scoped in-memory storage
const mockStore: Todo[] = [
  {
    id: "1",
    title: "Learn Effect",
    content: "Study Effect library fundamentals and patterns",
    status: "PENDING",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Build Remix App",
    content: "Create a CRUD application with Remix and Effect",
    status: "PENDING",
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    title: "Write Tests",
    content: "Add comprehensive test coverage for the application",
    status: "COMPLETED",
    createdAt: new Date().toISOString(),
  },
]

export const getTodos = (): Todo[] => {
  return [...mockStore]
}

export const getTodo = (id: string): Todo | undefined => {
  return mockStore.find((todo) => todo.id === id)
}

export const createTodo = (data: Omit<Todo, "id" | "createdAt">): Todo => {
  const newTodo: Todo = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  mockStore.push(newTodo)
  return newTodo
}

export const updateTodo = (
  id: string,
  data: Partial<Omit<Todo, "id" | "createdAt">>,
): Todo | undefined => {
  const index = mockStore.findIndex((todo) => todo.id === id)
  if (index === -1) return undefined

  mockStore[index] = {
    ...mockStore[index],
    ...data,
  }
  return mockStore[index]
}

export const deleteTodo = (id: string): boolean => {
  const index = mockStore.findIndex((todo) => todo.id === id)
  if (index === -1) return false

  mockStore.splice(index, 1)
  return true
}

export const toggleTodo = (id: string): Todo | undefined => {
  const todo = getTodo(id)
  if (!todo) return undefined

  return updateTodo(id, {
    status: todo.status === "PENDING" ? "COMPLETED" : "PENDING",
  })
}
