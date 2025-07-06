import { Link, createFileRoute } from '@tanstack/react-router'

import { authClient } from '@/libs/auth-client'
import { LoginForm } from '@effectify/chat-react/components/login-form'
import { buttonVariants } from '@effectify/react-ui/components/primitives/button'

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
      navigate({ to: '/' })
    } catch (error) {}
  }
  return (
    <LoginForm handleSubmit={handleSubmit}>
      <Link to="/register" className={buttonVariants({ variant: 'link' })}>
        Create account here
      </Link>
    </LoginForm>
  )
}
