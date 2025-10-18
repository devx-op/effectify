import * as Atom from '@effect-atom/atom/Atom'
import { RegistryProvider, useAtom, useAtomValue } from '@effectify/solid-effect-atom'
import { createFileRoute } from '@tanstack/solid-router'

// Create atoms for the counter example
const countAtom = Atom.make(0)
const doubledCountAtom = Atom.make((get) => get(countAtom) * 2)
const isEvenAtom = Atom.make((get) => get(countAtom) % 2 === 0)

// Counter component using Effect atoms
function CounterExample() {
  const [count, setCount] = useAtom(() => countAtom)
  const doubled = useAtomValue(() => doubledCountAtom)
  const isEven = useAtomValue(() => isEvenAtom)

  return (
    <div class="rounded-lg border p-6">
      <h3 class="mb-4 font-semibold text-lg">Counter Example with Effect Atoms</h3>
      <div class="space-y-4">
        <div class="flex items-center space-x-4">
          <div class="text-center">
            <p class="text-gray-600 text-sm dark:text-gray-400">Count</p>
            <p class="font-bold text-2xl">{count()}</p>
          </div>
          <div class="text-center">
            <p class="text-gray-600 text-sm dark:text-gray-400">Doubled</p>
            <p class="font-bold text-2xl text-blue-600">{doubled()}</p>
          </div>
          <div class="text-center">
            <p class="text-gray-600 text-sm dark:text-gray-400">Is Even</p>
            <p class={`font-bold text-2xl ${isEven() ? 'text-green-600' : 'text-red-600'}`}>
              {isEven() ? 'Yes' : 'No'}
            </p>
          </div>
        </div>

        <div class="flex space-x-2">
          <button
            class="rounded-md bg-red-600 px-4 py-2 font-medium text-sm text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            onClick={() => setCount(count() - 1)}
          >
            Decrement
          </button>
          <button
            class="rounded-md bg-gray-600 px-4 py-2 font-medium text-sm text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            onClick={() => setCount(0)}
          >
            Reset
          </button>
          <button
            class="rounded-md bg-green-600 px-4 py-2 font-medium text-sm text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            onClick={() => setCount(count() + 1)}
          >
            Increment
          </button>
        </div>

        <div class="text-gray-600 text-sm dark:text-gray-400">
          <p>This counter demonstrates:</p>
          <ul class="mt-2 list-inside list-disc space-y-1">
            <li>
              Basic atom state management with <code class="rounded bg-gray-100 px-1 dark:bg-gray-800">useAtom</code>
            </li>
            <li>Computed atoms that automatically update when dependencies change</li>
            <li>Fine-grained reactivity - only the specific values that change are updated</li>
            <li>Type-safe state management with Effect atoms</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/(protected)/dashboard/settings')({
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
    <RegistryProvider>
      <div class="flex flex-col gap-4">
        <h1 class="font-bold text-2xl">Settings</h1>

        {/* Counter Example Section */}
        <CounterExample />

        {/* Application Settings Section */}
        <div class="rounded-lg border p-6">
          <h2 class="mb-4 font-semibold text-lg">Application Settings</h2>
          <div class="space-y-4">
            <div>
              <label class="block font-medium text-gray-700 text-sm dark:text-gray-300" for="theme">
                Theme
              </label>
              <select
                class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                id="theme"
              >
                <option>Light</option>
                <option>Dark</option>
                <option>System</option>
              </select>
            </div>
            <div>
              <label class="block font-medium text-gray-700 text-sm dark:text-gray-300" for="language">
                Language
              </label>
              <select
                class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                id="language"
              >
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </div>
            <div class="flex items-center">
              <input
                class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                id="notifications"
                type="checkbox"
              />
              <label class="ml-2 text-gray-700 text-sm dark:text-gray-300" for="notifications">
                Enable notifications
              </label>
            </div>
          </div>
          <div class="mt-6">
            <button class="rounded-md bg-blue-600 px-4 py-2 font-medium text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </RegistryProvider>
  )
}
