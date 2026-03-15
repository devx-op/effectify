import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("./routes/home.tsx"),
  route("react-query", "./routes/react-query-demo.tsx"),
  route("about", "./routes/about.tsx"),
] satisfies RouteConfig
