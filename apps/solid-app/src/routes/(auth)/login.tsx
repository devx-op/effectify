import { Button } from '@/components/ui/button'
import * as Card from '@/components/ui/card'
import { Center } from '@/components/ui/center'
import { Separator } from '@/components/ui/separator'
import { Stack, VStack } from '@/components/ui/stack'

import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/(auth)/login')({
  component: RouteComponent,
})

function RouteComponent() {
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
                <Card.Title>Sign In</Card.Title>
                <Card.Description>Use your email address or social account to sign in.</Card.Description>
              </>
            </Stack>
          </Card.Header>
          <Card.Body>
            <Stack gap="3">
              <Button>Log in</Button>
              <VStack class="w-full" justify="center" align="center">
                <Separator />
                <p class="text-sm">OR</p>
                <Separator />

                <p class="px-8 text-center text-sm text-muted-foreground">
                  By clicking continue, you agree to our{' '}
                  <a
                    // biome-ignore lint/a11y/useValidAnchor: <explanation>
                    href="#"
                    class="underline underline-offset-4 hover:text-primary"
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    // biome-ignore lint/a11y/useValidAnchor: <explanation>
                    href="#"
                    class="underline underline-offset-4 hover:text-primary"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </VStack>
            </Stack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </VStack>
  )
}
