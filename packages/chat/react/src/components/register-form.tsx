import type * as React from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@effectify/react-ui/components/primitives/card'
import { Stack, VStack } from '@effectify/react-ui/components/primitives/stack'

import { RegisterSchema } from '@effectify/chat-domain/auth'
import { Button } from '@effectify/react-ui/components/primitives/button'
import { Center } from '@effectify/react-ui/components/primitives/center'
import { Input } from '@effectify/react-ui/components/primitives/input'
import { Label } from '@effectify/react-ui/components/primitives/label'
import { useForm } from '@tanstack/react-form'

type RegisterFormProps = {
  handleSubmit: (values: { name: string; email: string; password: string; confirmPassword: string }) => Promise<void>
  children?: React.ReactNode
}

export const RegisterForm: React.FC<RegisterFormProps> = (props) => {
  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validators: {
      onBlur: RegisterSchema,
    },
    onSubmit: async ({ value }) => {
      // Do something with form data
      console.log(value)
      props.handleSubmit(value)
    },
  })

  return (
    <VStack gap="6" className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
      <VStack className="mt-auto">
        <Card>
          <CardHeader>
            <Stack gap="6">
              <Center>
                <a href="/" aria-label="Back home">
                  {/* <Logo /> */}
                </a>
              </Center>
              <>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Enter your information to create a new account.</CardDescription>
              </>
            </Stack>
          </CardHeader>
          <CardContent>
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
                  >
                    {(field) => (
                      <>
                        <Label htmlFor={field.name}>Name</Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          placeholder="Your full name"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        {field.state.meta.errors.length > 0 && (
                          <span className="text-red-500 text-sm">{!field.state.meta.errors[0]}</span>
                        )}
                      </>
                    )}
                  </form.Field>
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
                  >
                    {(field) => (
                      <>
                        <Label htmlFor={field.name}>Email</Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="email"
                          placeholder="email@example.com"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        {field.state.meta.errors.length > 0 && (
                          <span className="text-red-500 text-sm">{!field.state.meta.errors[0]}</span>
                        )}
                      </>
                    )}
                  </form.Field>
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
                  >
                    {(field) => (
                      <>
                        <Label htmlFor={field.name}>Password</Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="password"
                          placeholder="password"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        {field.state.meta.errors.length > 0 && (
                          <span className="text-red-500 text-sm">{!field.state.meta.errors[0]}</span>
                        )}
                      </>
                    )}
                  </form.Field>
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
                  >
                    {(field) => (
                      <>
                        <Label htmlFor={field.name}>Confirm Password</Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="password"
                          placeholder="Confirm your password"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        {field.state.meta.errors.length > 0 && (
                          <span className="text-red-500 text-sm">{!field.state.meta.errors[0]}</span>
                        )}
                      </>
                    )}
                  </form.Field>
                  <Button type="submit">Create Account</Button>
                </Stack>
              </form>
              <Stack gap="2" className="text-center text-sm mt-2.5">
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
