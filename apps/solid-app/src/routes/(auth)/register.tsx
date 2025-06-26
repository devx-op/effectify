import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/(auth)/register')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(auth)/register"!</div>
}
