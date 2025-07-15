import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(protected)/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(protected)/dashboard"!</div>
}
