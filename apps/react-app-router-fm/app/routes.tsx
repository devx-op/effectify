import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("./app.tsx"),
  route("api/*", "./routes/api.ts"),
  route("api/auth/*", "./routes/api.auth.ts"),
  route("about", "./routes/about.tsx"),
  route("login", "./routes/login.tsx"),
  route("signup", "./routes/signup.tsx"),
] satisfies RouteConfig
