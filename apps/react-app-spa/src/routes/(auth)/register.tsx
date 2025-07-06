import { Link, createFileRoute } from '@tanstack/react-router'

import { authClient } from '@/libs/auth-client'
import { RegisterForm } from '@effectify/chat-react/components/register-form'
import { buttonVariants } from '@effectify/react-ui/components/primitives/button'

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
        navigate({ to: '/' })
      }
      console.log(values)
    } catch (error) {
      console.error('Registration error:', error)
    }
  }

  return (
    <RegisterForm handleSubmit={handleSubmit}>
      <Link to="/login" className={buttonVariants({ variant: 'link' })}>
        Sign in here
      </Link>
    </RegisterForm>
  )
}
