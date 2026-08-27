import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [index("routes/_index.tsx"), route("api/auth/*", "routes/api.auth.$.ts")] satisfies RouteConfig
