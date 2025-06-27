import * as Card from '@/components/ui/card'

import { Button, buttonVariants } from '@/components/ui/button'
import { Stack, VStack } from '@/components/ui/stack'
import { TextField, TextFieldDescription, TextFieldLabel, TextFieldRoot } from '@/components/ui/textfield'
import { Link, createFileRoute } from '@tanstack/solid-router'

import { Center } from '@/components/ui/center'
import { authClient } from '@/libs/auth-client'
import { createForm } from '@tanstack/solid-form'
import { Schema } from 'effect'

const RegisterSchema = Schema.standardSchemaV1(
  Schema.Struct({
    name: Schema.String.pipe(
      Schema.minLength(2),
      Schema.annotations({
        message: () => '[Effect/Schema] Name must have a length of at least 2',
      }),
    ),
    email: Schema.String.pipe(
      Schema.minLength(3),
      Schema.annotations({
        message: () => '[Effect/Schema] You must have a length of at least 3',
      }),
    ),
    password: Schema.String.pipe(
      Schema.minLength(6),
      Schema.annotations({
        message: () => '[Effect/Schema] Password must have a length of at least 6',
      }),
    ),
    confirmPassword: Schema.String.pipe(
      Schema.minLength(6),
      Schema.annotations({
        message: () => '[Effect/Schema] Confirm password must have a length of at least 6',
      }),
    ),
  }).pipe(
    Schema.filter((input) => {
      const issues: Array<Schema.FilterIssue> = []
      if (input.password !== input.confirmPassword) {
        issues.push({
          path: ['confirmPassword'],
          message: '[Effect/Schema] Passwords do not match',
        })
      }
      return issues
    }),
  ),
)

export const Route = createFileRoute('/(auth)/register')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = Route.useNavigate()
  const form = createForm(() => ({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    onChange: RegisterSchema,
    onSubmitInvalid: (e) => {
      console.error('Invalid form', e)
    },
    onSubmit: async ({ value }) => {
      // Check if passwords match
      if (value.password !== value.confirmPassword) {
        console.error('Passwords do not match')
        return
      }
      // Do something with form data
      const res = await authClient.signUp.email({
        email: value.email,
        password: value.password,
        name: value.name,
      })
      if (res.error) {
        console.error('Error signing up', res.error)
        return
      }
      if (res.data?.user) {
        navigate({ to: '/dashboard' })
      }
      console.log(value)
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
                    children={(field) => (
                      <TextFieldRoot>
                        <TextFieldLabel>Full Name</TextFieldLabel>
                        <TextField
                          placeholder={'Enter your full name'}
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
                    children={(field) => (
                      <TextFieldRoot>
                        <TextFieldLabel>Email</TextFieldLabel>
                        <TextField
                          placeholder={'Enter your email'}
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
                          type="password"
                          placeholder={'Enter your password'}
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
                    children={(field) => (
                      <TextFieldRoot validationState={field().state.meta.errorMap.onBlur ? 'invalid' : 'valid'}>
                        <TextFieldLabel>Confirm Password</TextFieldLabel>
                        <TextField
                          type="password"
                          placeholder={'Confirm your password'}
                          name={field().name}
                          value={field().state.value}
                          onBlur={field().handleBlur}
                          onInput={(e) => field().handleChange(e.currentTarget.value)}
                        />
                        {/* {typeof field().state.meta.errors[0] === 'object' && ( */}
                        <TextFieldDescription>
                          {field().state.meta.isTouched && !field().state.meta.isValid ? (
                            <em>{field().state.meta.errors.join(',')}</em>
                          ) : null}
                          {field().state.meta.isValidating ? 'Validating...' : null}
                        </TextFieldDescription>
                        {/* )} */}
                      </TextFieldRoot>
                    )}
                  />

                  <Button type="submit">Create Account</Button>
                </Stack>
              </form>
              <Stack gap="2" class="text-center text-sm mt-2.5">
                <span>Already have an account?</span>
                <Link to="/login" class={buttonVariants({ variant: 'link' })}>
                  Sign in here
                </Link>
              </Stack>
            </Stack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </VStack>
  )
}
