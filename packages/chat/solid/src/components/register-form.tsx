import { RegisterSchema } from "@effectify/chat-domain/auth.ts"
import { Button } from "@effectify/solid-ui/components/primitives/button"
import * as Card from "@effectify/solid-ui/components/primitives/card"
import { Center } from "@effectify/solid-ui/components/primitives/center"
import { Stack, VStack } from "@effectify/solid-ui/components/primitives/stack"
import { Input, useAppForm } from "@effectify/solid-ui/components/primitives/tanstack-form"
import * as Schema from "effect/Schema"
import type { Component, JSX } from "solid-js"

type RegisterFormProps = {
  handleSubmit: (values: { name: string; email: string; password: string; confirmPassword: string }) => Promise<void>
  children?: JSX.Element
}

export const RegisterForm: Component<RegisterFormProps> = (props) => {
  const form = useAppForm(() => ({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    schema: Schema.standardSchemaV1(RegisterSchema),
    onSubmit: ({ value }: { value: { name: string; email: string; password: string; confirmPassword: string } }) => {
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
              <Card.Title>Create Account</Card.Title>
              <Card.Description>Enter your information to create a new account.</Card.Description>
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
                    children={(field) => (
                      <field.FormItem>
                        <field.FormLabel>Name</field.FormLabel>
                        <field.FormControl>
                          <Input
                            name={field().name}
                            onBlur={field().handleBlur}
                            onInput={(e: Event) => field().handleChange((e.currentTarget as HTMLInputElement).value)}
                            placeholder={"Your full name"}
                            value={field().state.value as string}
                          />
                        </field.FormControl>
                      </field.FormItem>
                    )}
                    name="name"
                    validators={{
                      onBlur: ({ value }: { value: string }) => {
                        if (!value || value.trim().length === 0) {
                          return "Name is required"
                        }
                        if (value.length < 2) {
                          return "Name must have a length of at least 2"
                        }
                        return
                      },
                    }}
                  />
                  <form.AppField
                    children={(field) => (
                      <field.FormItem>
                        <field.FormLabel>Email</field.FormLabel>
                        <field.FormControl>
                          <Input
                            name={field().name}
                            onBlur={field().handleBlur}
                            onInput={(e: Event) => field().handleChange((e.currentTarget as HTMLInputElement).value)}
                            placeholder={"email@example.com"}
                            type="email"
                            value={field().state.value as string}
                          />
                        </field.FormControl>
                      </field.FormItem>
                    )}
                    name="email"
                    validators={{
                      onBlur: ({ value }: { value: string }) => {
                        if (!value || value.trim().length === 0) {
                          return "Email is required"
                        }
                        if (value.length < 3) {
                          return "Email must have a length of at least 3"
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
                            placeholder={"password"}
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
                          return "Password is required"
                        }
                        if (value.length < 6) {
                          return "Password must have a length of at least 6"
                        }
                        return
                      },
                    }}
                  />
                  <form.AppField
                    children={(field) => (
                      <field.FormItem>
                        <field.FormLabel>Confirm Password</field.FormLabel>
                        <field.FormControl>
                          <Input
                            name={field().name}
                            onBlur={field().handleBlur}
                            onInput={(e: Event) => field().handleChange((e.currentTarget as HTMLInputElement).value)}
                            placeholder={"Confirm your password"}
                            type="password"
                            value={field().state.value as string}
                          />
                        </field.FormControl>
                      </field.FormItem>
                    )}
                    name="confirmPassword"
                    validators={{
                      onBlur: ({ value }: { value: string }) => {
                        if (!value || value.trim().length === 0) {
                          return "Confirm password is required"
                        }
                        if (value.length < 6) {
                          return "Confirm password must have a length of at least 6"
                        }
                        return
                      },
                    }}
                  />
                  <Button type="submit">Create Account</Button>
                </Stack>
              </form>
              <Stack class="mt-2.5 text-center text-sm" gap="2">
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
