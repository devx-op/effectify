import { RegisterSchema } from '@effectify/chat-domain/auth.ts'
import { Button } from '@effectify/react-ui/components/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@effectify/react-ui/components/primitives/card'
import { Center } from '@effectify/react-ui/components/primitives/center'
import { Stack, VStack } from '@effectify/react-ui/components/primitives/stack'
import { useAppForm } from '@effectify/react-ui/components/primitives/tanstack-form'
import * as Schema from 'effect/Schema'
import type * as React from 'react'

type RegisterFormProps = {
  handleSubmit: (values: { name: string; email: string; password: string; confirmPassword: string }) => Promise<void>
  children?: React.ReactNode
}

export const RegisterForm: React.FC<RegisterFormProps> = (props) => {
  const form = useAppForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validators: {
      onBlur: Schema.standardSchemaV1(RegisterSchema),
    },
    onSubmit: ({ value }) => {
      // Do something with form data
      props.handleSubmit(value)
    },
  })

  return (
    <VStack className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]" gap="6">
      <VStack className="mt-auto">
        <Card>
          <CardHeader>
            <Stack gap="6">
              <Center>
                <a aria-label="Back home" href="/">
                  {/* <Logo /> */}
                </a>
              </Center>
              <CardTitle>Create Account</CardTitle>
              <CardDescription>Enter your information to create a new account.</CardDescription>
            </Stack>
          </CardHeader>
          <CardContent>
            <Stack gap="3">
              <form.Root
                onSubmit={(e: React.FormEvent) => {
                  e.preventDefault()
                  e.stopPropagation()
                  form.handleSubmit()
                }}
              >
                <Stack gap="1">
                  <form.AppField
                    children={(field) => (
                      <field.Item>
                        <field.Label>Name</field.Label>
                        <field.Control>
                          <field.TextField
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                            placeholder="Your full name"
                            value={field.state.value as string}
                          />
                        </field.Control>
                        <field.Message />
                      </field.Item>
                    )}
                    name="name"
                    validators={{
                      onBlur: ({ value }: { value: string }) => {
                        if (!value || value.trim().length === 0) {
                          return 'Name is required'
                        }
                        if (value.length < 2) {
                          return 'Name must have a length of at least 2'
                        }
                        return
                      },
                    }}
                  />
                  <form.AppField
                    children={(field) => (
                      <field.Item>
                        <field.Label>Email</field.Label>
                        <field.Control>
                          <field.TextField
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                            placeholder="email@example.com"
                            type="email"
                            value={field.state.value as string}
                          />
                        </field.Control>
                        <field.Message />
                      </field.Item>
                    )}
                    name="email"
                    validators={{
                      onBlur: ({ value }: { value: string }) => {
                        if (!value || value.trim().length === 0) {
                          return 'Email is required'
                        }
                        if (value.length < 3) {
                          return 'Email must have a length of at least 3'
                        }
                        return
                      },
                    }}
                  />
                  <form.AppField
                    children={(field) => (
                      <field.Item>
                        <field.Label>Password</field.Label>
                        <field.Control>
                          <field.TextField
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                            placeholder="password"
                            type="password"
                            value={field.state.value as string}
                          />
                        </field.Control>
                        <field.Message />
                      </field.Item>
                    )}
                    name="password"
                    validators={{
                      onBlur: ({ value }: { value: string }) => {
                        if (!value || value.trim().length === 0) {
                          return 'Password is required'
                        }
                        if (value.length < 6) {
                          return 'Password must have a length of at least 6'
                        }
                        return
                      },
                    }}
                  />
                  <form.AppField
                    children={(field) => (
                      <field.Item>
                        <field.Label>Confirm Password</field.Label>
                        <field.Control>
                          <field.TextField
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                            placeholder="Confirm your password"
                            type="password"
                            value={field.state.value as string}
                          />
                        </field.Control>
                        <field.Message />
                      </field.Item>
                    )}
                    name="confirmPassword"
                    validators={{
                      onBlur: ({ value }: { value: string }) => {
                        if (!value || value.trim().length === 0) {
                          return 'Confirm password is required'
                        }
                        if (value.length < 6) {
                          return 'Confirm password must have a length of at least 6'
                        }
                        return
                      },
                    }}
                  />
                  <Button type="submit">Create Account</Button>
                </Stack>
              </form.Root>
              <Stack className="mt-2.5 text-center text-sm" gap="2">
                <span>Already have an account?</span>
                {props.children}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </VStack>
    </VStack>
  )
}
