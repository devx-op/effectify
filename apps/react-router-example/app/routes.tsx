import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("./app.tsx"),
  route("chat", "./routes/chat.tsx"),
  route("api/auth/*", "./routes/api.auth.ts"),
  route("api/hatchet/runs", "./routes/api.hatchet.runs.ts"),
  route("login", "./routes/login.tsx"),
  route("signup", "./routes/signup.tsx"),
  route("todo-app", "./routes/todo-app.tsx"),
  route("hatchet-crons", "./routes/hatchet-crons.tsx"),
] satisfies RouteConfig
