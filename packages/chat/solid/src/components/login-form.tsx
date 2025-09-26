import { LoginSchema } from '@effectify/chat-domain/auth.ts'
import { Button } from '@effectify/solid-ui/components/primitives/button'
import * as Card from '@effectify/solid-ui/components/primitives/card'
import { Center } from '@effectify/solid-ui/components/primitives/center'
import { Stack, VStack } from '@effectify/solid-ui/components/primitives/stack'
import { Input, useAppForm } from '@effectify/solid-ui/components/primitives/tanstack-form'
import * as Schema from 'effect/Schema'
import type { Component, JSX } from 'solid-js'

type LoginFormProps = {
  handleSubmit: (values: { email: string; password: string }) => Promise<void>
  children?: JSX.Element
}

export const LoginForm: Component<LoginFormProps> = (props) => {
  const form = useAppForm(() => ({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onBlur: Schema.standardSchemaV1(LoginSchema),
    },
    onSubmit: ({ value }: { value: { email: string; password: string } }) => {
      // Do something with form data
      props.handleSubmit(value)
    },
  }))
  return (
    <VStack class="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]" gap="6">
      <VStack class="mt-auto">
        <Card.Root>
          <Card.Header>
            <Stack gap="6">
              <Center>
                <a aria-label="Back home" href="/">
                  {/* <Logo /> */}
                </a>
              </Center>
              <Card.Title>Sign In</Card.Title>
              <Card.Description>Use your email address or social account to sign in.</Card.Description>
            </Stack>
          </Card.Header>
          <Card.Body>
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
                      children={(field) => (
                        <field.FormItem>
                          <field.FormLabel>Email</field.FormLabel>
                          <field.FormControl>
                            <Input
                              name={field().name}
                              onBlur={field().handleBlur}
                              onInput={(e: Event) => field().handleChange((e.currentTarget as HTMLInputElement).value)}
                              placeholder={'email'}
                              value={field().state.value as string}
                            />
                          </field.FormControl>
                        </field.FormItem>
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
                        <field.FormItem>
                          <field.FormLabel>Password</field.FormLabel>
                          <field.FormControl>
                            <Input
                              name={field().name}
                              onBlur={field().handleBlur}
                              onInput={(e: Event) => field().handleChange((e.currentTarget as HTMLInputElement).value)}
                              placeholder={'password'}
                              type="password"
                              value={field().state.value as string}
                            />
                          </field.FormControl>
                        </field.FormItem>
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
                    <Button type="submit">Log in</Button>
                  </Stack>
                </form>
              </form.AppForm>
              <Stack class="mt-2.5 text-center text-sm" gap="2">
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
