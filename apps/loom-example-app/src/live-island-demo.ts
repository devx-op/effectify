import { Atom, AtomRegistry } from "effect/unstable/reactivity"
import * as Schema from "effect/Schema"
import { Html, Hydration, Resumability } from "@effectify/loom"
import { liveIslandInitialCount } from "./app-config.js"

export interface CounterCommand {
  readonly _tag: "LoomExampleCounterCommand"
  readonly type: "increment" | "decrement" | "reset"
}

const counterCommand = (type: CounterCommand["type"]): CounterCommand => ({
  _tag: "LoomExampleCounterCommand",
  type,
})

export const counterAtom = Atom.serializable(Atom.make(liveIslandInitialCount).pipe(Atom.keepAlive), {
  key: "loom-example:counter",
  schema: Schema.Number,
})

export const incrementCounterRef = Resumability.makeExecutableRef("loom-example-app/live-island", "incrementCounter")
export const decrementCounterRef = Resumability.makeExecutableRef("loom-example-app/live-island", "decrementCounter")
export const resetCounterRef = Resumability.makeExecutableRef("loom-example-app/live-island", "resetCounter")
export const counterLiveRegionRef = Resumability.makeExecutableRef("loom-example-app/live-island", "renderCounter")

const readCounter = (registry: AtomRegistry.AtomRegistry): number => registry.get(counterAtom)

const writeCounter = (registry: AtomRegistry.AtomRegistry, value: number): void => {
  registry.set(counterAtom, value)
}

export const isCounterCommand = (value: unknown): value is CounterCommand =>
  typeof value === "object" &&
  value !== null &&
  "_tag" in value &&
  value._tag === "LoomExampleCounterCommand" &&
  "type" in value &&
  (value.type === "increment" || value.type === "decrement" || value.type === "reset")

export const applyCounterCommand = (command: unknown, registry: AtomRegistry.AtomRegistry): boolean => {
  if (!isCounterCommand(command)) {
    return false
  }

  switch (command.type) {
    case "increment": {
      writeCounter(registry, readCounter(registry) + 1)
      return true
    }
    case "decrement": {
      writeCounter(registry, readCounter(registry) - 1)
      return true
    }
    case "reset": {
      writeCounter(registry, liveIslandInitialCount)
      return true
    }
  }
}

const renderCounterValue = (value: unknown): ReturnType<typeof Html.el> =>
  Html.el(
    "strong",
    Html.attr("data-live-count-value", "true"),
    Html.children(String(typeof value === "number" ? value : liveIslandInitialCount)),
  )

const counterButton = (label: string, ref: Resumability.ExecutableRef, command: CounterCommand): Html.Child =>
  Html.el(
    "button",
    Html.attr("type", "button"),
    Html.attr("data-counter-action", command.type),
    Html.on("click", Resumability.handler(ref, command)),
    Html.children(label),
  )

export const registerLiveIslandExecutables = (
  registry: Resumability.LocalRegistry = Resumability.makeLocalRegistry(),
): Resumability.LocalRegistry => {
  Resumability.registerHandler(registry, incrementCounterRef, counterCommand("increment"))
  Resumability.registerHandler(registry, decrementCounterRef, counterCommand("decrement"))
  Resumability.registerHandler(registry, resetCounterRef, counterCommand("reset"))
  Resumability.registerLiveRegion<number>(registry, counterLiveRegionRef, counterAtom, renderCounterValue)

  return registry
}

const liveIslandSelector = '[data-demo="live-island-counter"]'
const liveCountSelector = '[data-live-count-value="true"]'
const counterActionSelector = "[data-counter-action]"

const asCounterCommandType = (value: string | undefined): CounterCommand["type"] | undefined => {
  switch (value) {
    case "increment":
    case "decrement":
    case "reset":
      return value
    default:
      return undefined
  }
}

export const activateLiveIslandFallback = (
  document: Document,
  registry: AtomRegistry.AtomRegistry = AtomRegistry.make(),
): boolean => {
  const island = document.querySelector(liveIslandSelector)
  const liveCount = document.querySelector(liveCountSelector)

  if (!(island instanceof HTMLElement) || !(liveCount instanceof HTMLElement)) {
    return false
  }

  const syncCountText = (): void => {
    liveCount.textContent = String(readCounter(registry))
  }

  if (island.dataset.liveIslandFallback !== "active") {
    const buttons = Array.from(document.querySelectorAll(counterActionSelector))

    for (const button of buttons) {
      if (!(button instanceof HTMLButtonElement)) {
        continue
      }

      const type = asCounterCommandType(button.dataset.counterAction)

      if (type === undefined) {
        continue
      }

      button.addEventListener("click", () => {
        applyCounterCommand(counterCommand(type), registry)
        syncCountText()
      })
    }

    island.dataset.liveIslandFallback = "active"
  }

  syncCountText()

  return true
}

export const renderLiveIslandDemo = (): Html.Child =>
  Html.el(
    "section",
    Html.attr("data-demo", "live-island-counter"),
    Html.hydrate(Hydration.strategy.visible()),
    Html.children(
      Html.el(
        "p",
        Html.children(
          "When the Loom server entry is in play this island resumes the server-rendered counter. In the plain Vite fallback it degrades to a tiny client-side enhancement instead of pretending SSR exists.",
        ),
      ),
      Html.el(
        "div",
        Html.attr("data-counter-controls", "true"),
        Html.children(
          counterButton("Increment", incrementCounterRef, counterCommand("increment")),
          Html.text(" "),
          counterButton("Decrement", decrementCounterRef, counterCommand("decrement")),
          Html.text(" "),
          counterButton("Reset", resetCounterRef, counterCommand("reset")),
        ),
      ),
      Html.el(
        "p",
        Html.children(
          "Current count: ",
          Html.live(counterAtom, Resumability.live<number>(counterLiveRegionRef, renderCounterValue)),
        ),
      ),
    ),
  )
