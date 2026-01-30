import { LoginSchema } from "@effectify/chat-domain/auth.ts"
import { Button } from "@effectify/react-ui/components/primitives/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@effectify/react-ui/components/primitives/card"
import { Center } from "@effectify/react-ui/components/primitives/center"
import { Stack, VStack } from "@effectify/react-ui/components/primitives/stack"
import { useAppForm } from "@effectify/react-ui/components/primitives/tanstack-form"
import * as Schema from "effect/Schema"
import type React from "react"

type LoginFormProps = {
  handleSubmit: (values: { email: string; password: string }) => Promise<void>
  children?: React.ReactNode
}

export const LoginForm: React.FC<LoginFormProps> = (props) => {
  const form = useAppForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onBlur: Schema.standardSchemaV1(LoginSchema),
    },
    onSubmit: ({ value }: { value: { email: string; password: string } }) => {
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

              <CardTitle>Sign In</CardTitle>
              <CardDescription>Use your email address or social account to sign in.</CardDescription>
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
                        <field.Label>Email</field.Label>
                        <field.Control>
                          <field.TextField
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                            placeholder={"email"}
                            value={field.state.value as string}
                          />
                        </field.Control>
                        <field.Message />
                      </field.Item>
                    )}
                    name="email"
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
                            placeholder={"password"}
                            type="password"
                            value={field.state.value as string}
                          />
                        </field.Control>
                        <field.Message />
                      </field.Item>
                    )}
                    name="password"
                  />
                  <Button type="submit">Log in</Button>
                </Stack>
              </form.Root>
              <Stack className="mt-2.5 text-center text-sm" gap="2">
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
