import { authClient } from '@/libs/auth-client'
import { LoginForm } from '@effectify/chat-solid/components/login-form'
import { buttonVariants } from '@effectify/solid-ui/components/primitives/button'
import { Link, createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/(auth)/login')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = Route.useNavigate()
  const handleSubmit = async (values: { email: string; password: string }) => {
    // Do something with form data
    console.log(values)
    try {
      await authClient.signIn.email({
        email: values.email,
        password: values.password,
      })
      navigate({ to: '/dashboard' })
    } catch (error) {}
  }
  return (
    <LoginForm handleSubmit={handleSubmit}>
      <Link to="/register" class={buttonVariants({ variant: 'link' })}>
        Create account here
      </Link>
    </LoginForm>
  )
}
