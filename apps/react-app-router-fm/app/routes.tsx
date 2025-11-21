import { index, type RouteConfig, route } from '@react-router/dev/routes'

export default [
  index('./app.tsx'),
  route('api/*', './routes/api.ts'),
  route('about', './routes/about.tsx'),
] satisfies RouteConfig
