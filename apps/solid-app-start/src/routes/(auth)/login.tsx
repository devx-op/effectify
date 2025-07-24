import { LoginForm } from '@effectify/chat-solid/components/login-form'
import { buttonVariants } from '@effectify/solid-ui/components/primitives/button'
import { createFileRoute, Link } from '@tanstack/solid-router'
import { authClient } from '@/libs/auth-client'

export const Route = createFileRoute('/(auth)/login')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = Route.useNavigate()
  const handleSubmit = async (values: { email: string; password: string }) => {
    // Do something with form data
    try {
      await authClient.signIn.email({
        email: values.email,
        password: values.password,
      })
      navigate({ to: '/dashboard' })
    } catch {
      navigate({ to: '/login' })
    }
  }
  return (
    <LoginForm handleSubmit={handleSubmit}>
      <Link class={buttonVariants({ variant: 'link' })} to="/register">
        Create account here
      </Link>
    </LoginForm>
  )
}
