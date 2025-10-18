import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/(protected)/dashboard/profile')({
  component: RouteComponent,
  beforeLoad: () => {
    // const session = useSession()
    // if (!session().data?.session) {
    //   throw redirect({ to: '/login' })
    // }
  },
})

function RouteComponent() {
  return (
    <div class="flex flex-col gap-4">
      <h1 class="font-bold text-2xl">Profile</h1>
      <div class="rounded-lg border p-6">
        <div class="mb-6">
          <div class="flex items-center space-x-4">
            <div class="h-20 w-20 rounded-full bg-gray-300 dark:bg-gray-600" />
            <div>
              <h2 class="font-semibold text-xl">John Doe</h2>
              <p class="text-gray-600 dark:text-gray-400">john.doe@example.com</p>
              <button class="mt-2 text-blue-600 text-sm hover:text-blue-800 dark:text-blue-400">Change Avatar</button>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block font-medium text-gray-700 text-sm dark:text-gray-300" for="fullName">
              Full Name
            </label>
            <input
              class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              id="fullName"
              type="text"
              value="John Doe"
            />
          </div>

          <div>
            <label class="block font-medium text-gray-700 text-sm dark:text-gray-300" for="email">
              Email
            </label>
            <input
              class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              id="email"
              type="email"
              value="john.doe@example.com"
            />
          </div>

          <div>
            <label class="block font-medium text-gray-700 text-sm dark:text-gray-300" for="bio">
              Bio
            </label>
            <textarea
              class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              id="bio"
              placeholder="Tell us about yourself..."
              rows="3"
            >
              Software Developer passionate about creating amazing user experiences.
            </textarea>
          </div>

          <div>
            <label class="block font-medium text-gray-700 text-sm dark:text-gray-300" for="location">
              Location
            </label>
            <input
              class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              id="location"
              type="text"
              value="San Francisco, CA"
            />
          </div>
        </div>

        <div class="mt-6 flex space-x-3">
          <button class="rounded-md bg-blue-600 px-4 py-2 font-medium text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Save Changes
          </button>
          <button class="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
