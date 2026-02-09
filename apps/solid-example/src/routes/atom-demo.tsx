import { createFileRoute } from "@tanstack/solid-router"
import * as Atom from "@effect-atom/atom/Atom"
import * as AtomRef from "@effect-atom/atom/AtomRef"
import {
  RegistryProvider,
  useAtom,
  useAtomInitialValues,
  useAtomMount,
  useAtomRef,
  useAtomRefresh,
  useAtomSet,
  useAtomSubscribe,
  useAtomValue,
} from "@effectify/solid-effect-atom"
import { createSignal } from "solid-js"

export const Route = createFileRoute("/atom-demo")({
  component: AtomDemo,
})

const counterAtom = Atom.make(0)
const textAtom = Atom.make("Initial Text")
const refAtom = AtomRef.make({ count: 10, name: "AtomRef" })
const setOnlyAtom = Atom.make(0)
const subscribeAtom = Atom.make(0)
const mountAtom = Atom.make(0)

function Counter() {
  const [count, setCount] = useAtom(counterAtom)
  return (
    <div class="p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl">
      <h3 class="text-xl font-semibold text-white mb-4">Counter (useAtom)</h3>
      <p class="text-3xl font-bold text-cyan-400 mb-6">{count()}</p>
      <div class="flex gap-4">
        <button
          class="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors"
          onClick={() => setCount((c: number) => c + 1)}
        >
          Increment
        </button>
        <button
          class="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
          onClick={() => setCount(0)}
        >
          Reset
        </button>
      </div>
    </div>
  )
}

function DoubledCounter() {
  const doubled = useAtomValue(counterAtom, (n: number) => n * 2)
  return (
    <div class="p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl">
      <h3 class="text-xl font-semibold text-white mb-4">Doubled (useAtomValue)</h3>
      <p class="text-3xl font-bold text-purple-400 mb-6">{doubled()}</p>
      <p class="text-gray-400">Derived from counter value * 2</p>
    </div>
  )
}

function InitialValuesDemo() {
  useAtomInitialValues([[textAtom, "Overridden Initial Value"]])
  const [text] = useAtom(textAtom)

  return (
    <div class="p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl">
      <h3 class="text-xl font-semibold text-white mb-4">Initial Values</h3>
      <p class="text-lg text-emerald-400 mb-2">"{text()}"</p>
      <p class="text-gray-400 text-sm">Initialized via useAtomInitialValues</p>
    </div>
  )
}

function RefreshDemo() {
  const refresh = useAtomRefresh(counterAtom)
  return (
    <div class="p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl">
      <h3 class="text-xl font-semibold text-white mb-4">Refresh Atom</h3>
      <p class="text-gray-400 mb-4">Forces re-evaluation/reset of the atom</p>
      <button
        class="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-lg transition-colors"
        onClick={() => refresh()}
      >
        Refresh Counter
      </button>
    </div>
  )
}

function AtomRefDemo() {
  const state = useAtomRef(refAtom)

  return (
    <div class="p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl">
      <h3 class="text-xl font-semibold text-white mb-4">AtomRef</h3>
      <div class="mb-6">
        <p class="text-lg text-orange-400">Count: {state().count}</p>
        <p class="text-lg text-orange-400">Name: {state().name}</p>
      </div>
      <button
        class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
        onClick={() => refAtom.set({ ...state(), count: state().count + 1 })}
      >
        Update Ref
      </button>
    </div>
  )
}

function SetOnlyDemo() {
  const setCount = useAtomSet(setOnlyAtom)
  const count = useAtomValue(setOnlyAtom)

  return (
    <div class="p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl">
      <h3 class="text-xl font-semibold text-white mb-4">Set Only (useAtomSet)</h3>
      <p class="text-3xl font-bold text-teal-400 mb-6">{count()}</p>
      <button
        class="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-colors"
        onClick={() => setCount((c: number) => c + 10)}
      >
        Add 10
      </button>
    </div>
  )
}

function SubscribeDemo() {
  const [logs, setLogs] = createSignal<string[]>([])

  useAtomSubscribe(subscribeAtom, (val: number) => {
    setLogs((prev) => [`Value changed to: ${val}`, ...prev].slice(0, 3))
  })

  const setCount = useAtomSet(subscribeAtom)

  return (
    <div class="p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl">
      <h3 class="text-xl font-semibold text-white mb-4">Subscribe (useAtomSubscribe)</h3>
      <button
        class="mb-4 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg transition-colors"
        onClick={() => setCount((c: number) => c + 1)}
      >
        Trigger Change
      </button>
      <div class="bg-slate-900/50 p-3 rounded font-mono text-sm text-gray-300">
        {logs().map((log) => <div>{log}</div>)}
        {logs().length === 0 && <div class="text-gray-500">No changes yet...</div>}
      </div>
    </div>
  )
}

function MountDemo() {
  // This atom will log when mounted/unmounted if we added effects to it
  // For this demo, we just show that useAtomMount can be called
  useAtomMount(mountAtom)

  return (
    <div class="p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl">
      <h3 class="text-xl font-semibold text-white mb-4">Mount (useAtomMount)</h3>
      <p class="text-gray-400 mb-4">Manually mounts an atom without reading its value.</p>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
        <span class="text-green-400">Atom Mounted</span>
      </div>
    </div>
  )
}

function AtomDemo() {
  return (
    <RegistryProvider>
      <div class="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-8">
        <div class="max-w-7xl mx-auto">
          <h1 class="text-4xl font-black mb-8">
            <span class="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Effect Atom
            </span>{" "}
            Demo
          </h1>

          <p class="text-xl text-gray-300 mb-12">
            Demonstrating @effectify/solid-effect-atom v0.3.0
          </p>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Counter />
            <DoubledCounter />
            <InitialValuesDemo />
            <RefreshDemo />
            <AtomRefDemo />
            <SetOnlyDemo />
            <SubscribeDemo />
            <MountDemo />
          </div>
        </div>
      </div>
    </RegistryProvider>
  )
}
