import { Flex } from '@effectify/react-ui/components/primitives/flex'
import { VStack } from '@effectify/react-ui/components/primitives/stack'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useCheckSession } from '@/hooks/check-session-hook'

export const Route = createFileRoute('/(auth)')({
  component: Layout,
})

function Layout() {
  useCheckSession()
  return (
    <VStack align="center" className="relative h-screen md:grid lg:max-w-none lg:grid-cols-2 lg:px-0" justify="center">
      <VStack className="relative hidden h-full bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-zinc-900" />
        <Flex align="center" className="relative z-20 font-medium text-lg">
          <svg
            className="mr-2 h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            <title>Logo</title>
          </svg>
          Acme Inc
        </Flex>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;This library has saved me countless hours of work and helped me deliver stunning designs to my
              clients faster than ever before.&rdquo;
            </p>
            <footer className="text-sm">Sofia Davis</footer>
          </blockquote>
        </div>
      </VStack>
      <div className="lg:p-8">
        <Outlet />
      </div>
    </VStack>
  )
}
