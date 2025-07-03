import { LoginSchema } from '@effectify/chat-domain/auth'
import { Button } from '@effectify/solid-ui/components/primitives/button'
import * as Card from '@effectify/solid-ui/components/primitives/card'
import { Center } from '@effectify/solid-ui/components/primitives/center'
import { Stack, VStack } from '@effectify/solid-ui/components/primitives/stack'
import { TextField, TextFieldLabel, TextFieldRoot } from '@effectify/solid-ui/components/primitives/textfield'
import { createForm } from '@tanstack/solid-form'
// import { Link } from '@tanstack/solid-router'
import type { Component, JSX } from 'solid-js'

type LoginFormProps = {
  handleSubmit: (values: { email: string; password: string }) => Promise<void>
  children?: JSX.Element
}

export const LoginForm: Component<LoginFormProps> = (props) => {
  const form = createForm(() => ({
    defaultValues: {
      email: '',
      password: '',
    },
    schema: LoginSchema,
    onSubmit: async ({ value }) => {
      // Do something with form data
      console.log(value)
      props.handleSubmit(value)
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
                    validators={{
                      onBlur: ({ value }) => {
                        if (!value || value.trim().length === 0) {
                          return 'Email is required'
                        }
                        if (value.length < 3) {
                          return 'Email must have a length of at least 3'
                        }
                        return undefined
                      },
                    }}
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
                {props.children}
              </Stack>
            </Stack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </VStack>
  )
}
