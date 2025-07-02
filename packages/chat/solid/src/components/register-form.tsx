import { RegisterSchema } from '@/domain/auth'
import { Button } from '@effectify/solid-ui/components/primitives/button'
import * as Card from '@effectify/solid-ui/components/primitives/card'
import { Center } from '@effectify/solid-ui/components/primitives/center'
import { Stack, VStack } from '@effectify/solid-ui/components/primitives/stack'
import { TextField, TextFieldLabel, TextFieldRoot } from '@effectify/solid-ui/components/primitives/textfield'
import { createForm } from '@tanstack/solid-form'
import type { Component, JSX } from 'solid-js'

type RegisterFormProps = {
  handleSubmit: (values: { name: string; email: string; password: string; confirmPassword: string }) => Promise<void>
  children?: JSX.Element
}

export const RegisterForm: Component<RegisterFormProps> = (props) => {
  const form = createForm(() => ({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    schema: RegisterSchema,
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
                <Card.Title>Create Account</Card.Title>
                <Card.Description>Enter your information to create a new account.</Card.Description>
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
                    name="name"
                    validators={{
                      onBlur: ({ value }) => {
                        if (!value || value.trim().length === 0) {
                          return 'Name is required'
                        }
                        if (value.length < 2) {
                          return 'Name must have a length of at least 2'
                        }
                        return undefined
                      },
                    }}
                    children={(field) => (
                      <TextFieldRoot>
                        <TextFieldLabel>Name</TextFieldLabel>
                        <TextField
                          placeholder={'Your full name'}
                          name={field().name}
                          value={field().state.value}
                          onBlur={field().handleBlur}
                          onInput={(e) => field().handleChange(e.currentTarget.value)}
                        />
                      </TextFieldRoot>
                    )}
                  />
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
                          placeholder={'email@example.com'}
                          type="email"
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
                    validators={{
                      onBlur: ({ value }) => {
                        if (!value || value.trim().length === 0) {
                          return 'Password is required'
                        }
                        if (value.length < 6) {
                          return 'Password must have a length of at least 6'
                        }
                        return undefined
                      },
                    }}
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
                  <form.Field
                    name="confirmPassword"
                    validators={{
                      onBlur: ({ value }) => {
                        if (!value || value.trim().length === 0) {
                          return 'Confirm password is required'
                        }
                        if (value.length < 6) {
                          return 'Confirm password must have a length of at least 6'
                        }
                        return undefined
                      },
                    }}
                    children={(field) => (
                      <TextFieldRoot>
                        <TextFieldLabel>Confirm Password</TextFieldLabel>
                        <TextField
                          placeholder={'Confirm your password'}
                          type="password"
                          name={field().name}
                          value={field().state.value}
                          onBlur={field().handleBlur}
                          onInput={(e) => field().handleChange(e.currentTarget.value)}
                        />
                      </TextFieldRoot>
                    )}
                  />
                  <Button type="submit">Create Account</Button>
                </Stack>
              </form>
              <Stack gap="2" class="text-center text-sm mt-2.5">
                <span>Already have an account?</span>
                {props.children}
              </Stack>
            </Stack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </VStack>
  )
}
