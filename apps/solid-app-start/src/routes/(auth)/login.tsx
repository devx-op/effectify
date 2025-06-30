import * as Card from '@/components/ui/card'

import { Button, buttonVariants } from '@/components/ui/button'
import { Stack, VStack } from '@/components/ui/stack'
import { TextField, TextFieldLabel, TextFieldRoot } from '@/components/ui/textfield'
import { Link, createFileRoute } from '@tanstack/solid-router'

import { Center } from '@/components/ui/center'
import { authClient } from '@/libs/auth-client'
import { createForm } from '@tanstack/solid-form'
import { Schema } from 'effect'

const LoginSchema = Schema.standardSchemaV1(
  Schema.Struct({
    email: Schema.String.pipe(
      Schema.minLength(3),
      Schema.annotations({
        message: () => '[Effect/Schema] You must have a length of at least 3',
      }),
    ),
    password: Schema.String.pipe(
      Schema.minLength(3),
      Schema.annotations({
        message: () => '[Effect/Schema] You must have a length of at least 3',
      }),
    ),
  }),
)

export const Route = createFileRoute('/(auth)/login')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = Route.useNavigate()
  const form = createForm(() => ({
    defaultValues: {
      email: '',
      password: '',
    },
    onChange: LoginSchema,
    onSubmit: async ({ value }) => {
      // Do something with form data
      console.log(value)
      try {
        await authClient.signIn.email({
          email: value.email,
          password: value.password,
        })
        navigate({ to: '/dashboard' })
      } catch (error) {}
    },
  }))
  return (
    <VStack gap="6" class="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
      <VStack class="mt-auto">
        <Card.Root>
          <Card.Header>
            <Stack gap="6">
              <Center>
                <a href="/" aria-label="Back home">
                  {/* <Logo /> */}
                </a>
              </Center>
              <>
                <Card.Title>Sign In</Card.Title>
                <Card.Description>Use your email address or social account to sign in.</Card.Description>
              </>
            </Stack>
          </Card.Header>
          <Card.Body>
            <Stack gap="3">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  form.handleSubmit()
                }}
              >
                <Stack gap="1">
                  <form.Field
                    name="email"
                    children={(field) => (
                      <TextFieldRoot>
                        <TextFieldLabel>Email</TextFieldLabel>
                        <TextField
                          placeholder={'email'}
                          name={field().name}
                          value={field().state.value}
                          onBlur={field().handleBlur}
                          onInput={(e) => field().handleChange(e.currentTarget.value)}
                        />
                      </TextFieldRoot>
                    )}
                  />
                  <form.Field
                    name="password"
                    children={(field) => (
                      <TextFieldRoot>
                        <TextFieldLabel>Password</TextFieldLabel>
                        <TextField
                          placeholder={'password'}
                          type="password"
                          name={field().name}
                          value={field().state.value}
                          onBlur={field().handleBlur}
                          onInput={(e) => field().handleChange(e.currentTarget.value)}
                        />
                      </TextFieldRoot>
                    )}
                  />
                  <Button type="submit">Log in</Button>
                </Stack>
              </form>
              <Stack gap="2" class="text-center text-sm mt-2.5">
                <span>Don't have an account?</span>
                <Link to="/register" class={buttonVariants({ variant: 'link' })}>
                  Create account here
                </Link>
              </Stack>
            </Stack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </VStack>
  )
}
