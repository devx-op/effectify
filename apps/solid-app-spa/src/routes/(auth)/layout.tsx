import { Navigate, Outlet, createFileRoute } from '@tanstack/solid-router'

import { Flex } from '@effectify/solid-ui/components/primitives/flex'
import { Spinner } from '@effectify/solid-ui/components/primitives/spinner'
import { VStack } from '@effectify/solid-ui/components/primitives/stack'

export const Route = createFileRoute('/(auth)')({
  component: Layout,
})

function Layout() {
  const isPending = false
  const session = null

  if (isPending) {
    return <Spinner />
  }

  if (!session) {
    return (
      <VStack align="center" justify="center" class="relative h-screen md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <VStack class="relative hidden h-full bg-muted p-10 text-white dark:border-r lg:flex">
          <div class="absolute inset-0 bg-zinc-900" />
          <Flex align="center" class="relative z-20 text-lg font-medium">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="mr-2 h-6 w-6"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
              <title>Logo</title>
            </svg>
            Acme Inc
          </Flex>
          <div class="relative z-20 mt-auto">
            <blockquote class="space-y-2">
              <p class="text-lg">
                &ldquo;This library has saved me countless hours of work and helped me deliver stunning designs to my
                clients faster than ever before.&rdquo;
              </p>
              <footer class="text-sm">Sofia Davis</footer>
            </blockquote>
          </div>
        </VStack>
        <div class="lg:p-8">
          <Outlet />
        </div>
      </VStack>
    )
  }

  return <Navigate to="/" />
}
