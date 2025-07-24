import { RegisterForm } from '@effectify/chat-solid/components/register-form'
import { buttonVariants } from '@effectify/solid-ui/components/primitives/button'
import { createFileRoute, Link } from '@tanstack/solid-router'
import { authClient } from '@/libs/auth-client'

export const Route = createFileRoute('/(auth)/register')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = Route.useNavigate()
  const handleSubmit = async (values: { name: string; email: string; password: string; confirmPassword: string }) => {
    // Check if passwords match
    if (values.password !== values.confirmPassword) {
      return
    }

    try {
      // Do something with form data
      const res = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
      })
      if (res.error) {
        return
      }
      if (res.data?.user) {
        navigate({ to: '/dashboard' })
      }
    } catch {
      navigate({ to: '/register' })
    }
  }

  return (
    <RegisterForm handleSubmit={handleSubmit}>
      <Link class={buttonVariants({ variant: 'link' })} to="/login">
        Sign in here
      </Link>
    </RegisterForm>
  )
}
