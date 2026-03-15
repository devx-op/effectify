import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("./app.tsx"),
  route("chat", "./routes/chat.tsx"),
] satisfies RouteConfig
