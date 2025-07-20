import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@effectify/react-ui/components/primitives/card'
import { Stack, VStack } from '@effectify/react-ui/components/primitives/stack'

import { LoginSchema } from '@effectify/chat-domain/auth.ts'
import { Button } from '@effectify/react-ui/components/primitives/button'
import { Center } from '@effectify/react-ui/components/primitives/center'
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
              <form.Root
                onSubmit={(e: React.FormEvent) => {
                  e.preventDefault()
                  e.stopPropagation()
                  form.handleSubmit()
                }}
              >
                <Stack gap="1">
                  <form.AppField
                    name="email"
                    children={(field) => (
                      <field.Item>
                        <field.Label>Email</field.Label>
                        <field.Control>
                          <field.TextField
                            placeholder={'email'}
                            name={field.name}
                            value={field.state.value as string}
                            onBlur={field.handleBlur}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                          />
                        </field.Control>
                        <field.Message />
                      </field.Item>
                    )}
                  />
                  <form.AppField
                    name="password"
                    children={(field) => (
                      <field.Item>
                        <field.Label>Password</field.Label>
                        <field.Control>
                          <field.TextField
                            placeholder={'password'}
                            type="password"
                            name={field.name}
                            value={field.state.value as string}
                            onBlur={field.handleBlur}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                          />
                        </field.Control>
                        <field.Message />
                      </field.Item>
                    )}
                  />
                  <Button type="submit">Log in</Button>
                </Stack>
              </form.Root>
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
