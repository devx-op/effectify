import { buttonVariants } from '@effectify/solid-ui/components/primitives/button'
import { Link, createFileRoute } from '@tanstack/solid-router'

import { authClient } from '@/libs/auth-client'
import { RegisterForm } from '@effectify/chat-solid/components/register-form'

export const Route = createFileRoute('/(auth)/register')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = Route.useNavigate()
  const handleSubmit = async (values: { name: string; email: string; password: string; confirmPassword: string }) => {
    // Check if passwords match
    if (values.password !== values.confirmPassword) {
      console.error('Passwords do not match')
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
        console.error('Error signing up', res.error)
        return
      }
      if (res.data?.user) {
        navigate({ to: '/dashboard' })
      }
      console.log(values)
    } catch (error) {
      console.error('Registration error:', error)
    }
  }

  return (
    <RegisterForm handleSubmit={handleSubmit}>
      <Link to="/login" class={buttonVariants({ variant: 'link' })}>
        Sign in here
      </Link>
    </RegisterForm>
  )
}
