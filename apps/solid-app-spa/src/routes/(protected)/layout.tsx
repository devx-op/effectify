import { MainNavbar } from "@effectify/solid-ui/components/navbar/main-navbar"
import { Navbar } from "@effectify/solid-ui/components/navbar/navbar"
import { Flex } from "@effectify/solid-ui/components/primitives/flex"
import { HStack } from "@effectify/solid-ui/components/primitives/stack"
import { createFileRoute, Link, Outlet } from "@tanstack/solid-router"

export const Route = createFileRoute("/(protected)")({
  component: RouteComponent,
})

function RouteComponent() {
  const handleLogout = async () => {
    // try {
    //   await authClient.signOut()
    //   // Forzar navegación inmediata
    //   window.location.href = '/login'
    // } catch (error) {
    //   console.error('Error during logout:', error)
    // }
  }
  return (
    <HStack class="min-h-screen">
      <Flex class="w-full">
        <aside class="b-r-black dark:b-r-gray hidden w-64 border-1 md:block">
          <div class="p-4">
            <nav class="space-y-2">
              <h2 class="px-3 font-semibold text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                Dashboard
              </h2>
              <div class="space-y-1">
                <Link
                  activeClass="bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                  class="flex items-center rounded-md px-3 py-2 font-medium text-gray-700 text-sm hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                  to="/dashboard"
                >
                  <svg aria-hidden="true" class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                    <path
                      d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  Dashboard
                </Link>
                <Link
                  activeClass="bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                  class="flex items-center rounded-md px-3 py-2 font-medium text-gray-700 text-sm hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                  to="/dashboard/profile"
                >
                  <svg aria-hidden="true" class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  Profile
                </Link>
                <Link
                  activeClass="bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                  class="flex items-center rounded-md px-3 py-2 font-medium text-gray-700 text-sm hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                  to="/dashboard/settings"
                >
                  <svg aria-hidden="true" class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                    <path
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  Settings
                </Link>
              </div>
            </nav>
          </div>
        </aside>
        <main class="flex-1">
          <MainNavbar onLogout={handleLogout} />
          <Navbar />
          <div class="mx-auto max-w-7xl p-6">
            <Outlet />
          </div>
        </main>
      </Flex>
    </HStack>
  )
}
