import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@effectify/react-ui/components/primitives/card'
import { Stack, VStack } from '@effectify/react-ui/components/primitives/stack'

import { LoginSchema } from '@effectify/chat-domain/auth'
import { Button } from '@effectify/react-ui/components/primitives/button'
import { Center } from '@effectify/react-ui/components/primitives/center'
import { Input } from '@effectify/react-ui/components/primitives/input'
import { useAppForm } from '@effectify/react-ui/components/primitives/tanstack-form'
import type React from 'react'

type LoginFormProps = {
  handleSubmit: (values: { email: string; password: string }) => Promise<void>
  children?: React.ReactNode
}

export const LoginForm: React.FC<LoginFormProps> = (props) => {
  const form = useAppForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onBlur: LoginSchema,
    },
    onSubmit: async ({ value }: { value: { email: string; password: string } }) => {
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
                <CardTitle>Sign In</CardTitle>
                <CardDescription>Use your email address or social account to sign in.</CardDescription>
              </>
            </Stack>
          </CardHeader>
          <CardContent>
            <Stack gap="3">
              <form.AppForm>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    form.handleSubmit()
                  }}
                >
                  <Stack gap="1">
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
                              placeholder={'email'}
                              name={field.name}
                              value={field.state.value as string}
                              onBlur={field.handleBlur}
                              onInput={(e: React.FormEvent<HTMLInputElement>) =>
                                field.handleChange(e.currentTarget.value)
                              }
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
                              name={field.name}
                              value={field.state.value as string}
                              onBlur={field.handleBlur}
                              onInput={(e: React.FormEvent<HTMLInputElement>) =>
                                field.handleChange(e.currentTarget.value)
                              }
                            />
                          </field.FormControl>
                        </field.FormItem>
                      )}
                    />
                    <Button type="submit">Log in</Button>
                  </Stack>
                </form>
              </form.AppForm>
              <Stack gap="2" className="text-center text-sm mt-2.5">
                <span>Don't have an account?</span>
                {props.children}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </VStack>
    </VStack>
  )
}
