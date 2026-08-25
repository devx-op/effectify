import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("routes/_index.tsx"),
  route("demo", "routes/demo.tsx"),
  route("test", "routes/test.tsx"),
  route("todos", "routes/todos.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("api/auth/*", "routes/api.auth.$.ts"),
  route("api/*", "routes/api.$.ts"),
] satisfies RouteConfig
