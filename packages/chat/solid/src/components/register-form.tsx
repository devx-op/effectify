import * as Card from '@effectify/solid-ui/components/primitives/card'

import { Stack, VStack } from '@effectify/solid-ui/components/primitives/stack'
import { Input, useAppForm } from '@effectify/solid-ui/components/primitives/tanstack-form'
import type { Component, JSX } from 'solid-js'

import { RegisterSchema } from '@effectify/chat-domain/auth.ts'
import { Button } from '@effectify/solid-ui/components/primitives/button'
import { Center } from '@effectify/solid-ui/components/primitives/center'

type RegisterFormProps = {
  handleSubmit: (values: { name: string; email: string; password: string; confirmPassword: string }) => Promise<void>
  children?: JSX.Element
}

export const RegisterForm: Component<RegisterFormProps> = (props) => {
  const form = useAppForm(() => ({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    schema: RegisterSchema,
    onSubmit: async ({
      value,
    }: { value: { name: string; email: string; password: string; confirmPassword: string } }) => {
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
                  <form.AppField
                    name="name"
                    validators={{
                      onBlur: ({ value }: { value: string }) => {
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
                      <field.FormItem>
                        <field.FormLabel>Name</field.FormLabel>
                        <field.FormControl>
                          <Input
                            placeholder={'Your full name'}
                            name={field().name}
                            value={field().state.value as string}
                            onBlur={field().handleBlur}
                            onInput={(e: Event) => field().handleChange((e.currentTarget as HTMLInputElement).value)}
                          />
                        </field.FormControl>
                      </field.FormItem>
                    )}
                  />
                  <form.AppField
                    name="email"
                    validators={{
                      onBlur: ({ value }: { value: string }) => {
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
                      <field.FormItem>
                        <field.FormLabel>Email</field.FormLabel>
                        <field.FormControl>
                          <Input
                            placeholder={'email@example.com'}
                            type="email"
                            name={field().name}
                            value={field().state.value as string}
                            onBlur={field().handleBlur}
                            onInput={(e: Event) => field().handleChange((e.currentTarget as HTMLInputElement).value)}
                          />
                        </field.FormControl>
                      </field.FormItem>
                    )}
                  />
                  <form.AppField
                    name="password"
                    validators={{
                      onBlur: ({ value }: { value: string }) => {
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
                      <field.FormItem>
                        <field.FormLabel>Password</field.FormLabel>
                        <field.FormControl>
                          <Input
                            placeholder={'password'}
                            type="password"
                            name={field().name}
                            value={field().state.value as string}
                            onBlur={field().handleBlur}
                            onInput={(e: Event) => field().handleChange((e.currentTarget as HTMLInputElement).value)}
                          />
                        </field.FormControl>
                      </field.FormItem>
                    )}
                  />
                  <form.AppField
                    name="confirmPassword"
                    validators={{
                      onBlur: ({ value }: { value: string }) => {
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
                      <field.FormItem>
                        <field.FormLabel>Confirm Password</field.FormLabel>
                        <field.FormControl>
                          <Input
                            placeholder={'Confirm your password'}
                            type="password"
                            name={field().name}
                            value={field().state.value as string}
                            onBlur={field().handleBlur}
                            onInput={(e: Event) => field().handleChange((e.currentTarget as HTMLInputElement).value)}
                          />
                        </field.FormControl>
                      </field.FormItem>
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
