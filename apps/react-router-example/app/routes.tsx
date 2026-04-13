import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("./app.tsx"),
  route("chat", "./routes/chat.tsx"),
  // route("api/auth/*", "./routes/api.auth.ts"),
  route("login", "./routes/login.tsx"),
  route("signup", "./routes/signup.tsx"),
  route("todo-app", "./routes/todo-app.tsx"),
  route("hatchet-demo", "./routes/hatchet-demo/route.tsx", [
    index("./routes/hatchet-demo/index.tsx"),
    route("runs", "./routes/hatchet-demo/runs/route.tsx"),
    route("schedules", "./routes/hatchet-demo/schedules/route.tsx"),
    route("crons", "./routes/hatchet-demo/crons/route.tsx"),
    route("filters", "./routes/hatchet-demo/filters/route.tsx"),
    route("webhooks", "./routes/hatchet-demo/webhooks/route.tsx"),
    route("rate-limits", "./routes/hatchet-demo/rate-limits/route.tsx"),
    route("management", "./routes/hatchet-demo/management/route.tsx"),
    route("observability", "./routes/hatchet-demo/observability/route.tsx"),
  ]),
] satisfies RouteConfig
