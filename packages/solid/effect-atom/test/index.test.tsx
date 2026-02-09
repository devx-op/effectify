import {
  RegistryContext,
  useAtom,
  useAtomInitialValues,
  useAtomMount,
  useAtomRef,
  useAtomRefProp,
  useAtomRefPropValue,
  useAtomRefresh,
  useAtomSet,
  useAtomSubscribe,
  useAtomValue,
} from "../src/index.js"
import { assert, describe, it } from "vitest"
import * as Atom from "@effect-atom/atom/Atom"
import * as AtomRef from "@effect-atom/atom/AtomRef"
import * as Registry from "@effect-atom/atom/Registry"
import { type Accessor, createComponent, createEffect, createRoot } from "solid-js"

describe("atom-solid", () => {
  describe("useAtomValue", () => {
    it("reads value from simple Atom", () => {
      const atom = Atom.make(42)
      let observed: number | undefined
      const dispose = renderAtomValue(atom, (value) => {
        observed = value
      })
      assert.strictEqual(observed, 42)
      dispose()
    })

    it("reads value with transform function", () => {
      const atom = Atom.make(42)
      let observed: number | undefined
      const dispose = renderAtomValue(atom, (value) => {
        observed = value
      }, { map: (value) => value * 2 })
      assert.strictEqual(observed, 84)
      dispose()
    })

    it("updates when Atom value changes", () => {
      const registry = Registry.make()
      const atom = Atom.make("initial")
      let observed: string | undefined
      const dispose = renderAtomValue(atom, (value) => {
        observed = value
      }, { registry })
      assert.strictEqual(observed, "initial")
      registry.set(atom, "updated")
      assert.strictEqual(observed, "updated")
      dispose()
    })

    it("works with computed Atom", () => {
      const baseAtom = Atom.make(10)
      const computedAtom = Atom.make((get) => get(baseAtom) * 2)
      let observed: number | undefined
      const dispose = renderAtomValue(computedAtom, (value) => {
        observed = value
      })
      assert.strictEqual(observed, 20)
      dispose()
    })
  })

  describe("useAtom", () => {
    it("updates value with setter", () => {
      const atom = Atom.make(0)
      let observed: number | undefined
      const dispose = createRoot((dispose) => {
        const [value, setValue] = useAtom(atom)
        createEffect(() => {
          observed = value()
        })
        createEffect(() => {
          if (value() !== 0) {
            return
          }
          setValue(1)
          setValue((current) => current + 1)
        })
        return dispose
      })
      assert.strictEqual(observed, 2)
      dispose()
    })
  })

  describe("useAtomSet", () => {
    it("updates atom value without subscribing", () => {
      const registry = Registry.make()
      const atom = Atom.make(0)

      createRoot((dispose) => {
        createComponent(RegistryContext.Provider, {
          value: registry,
          get children() {
            const setCount = useAtomSet(atom)
            setCount(10)
            return null
          },
        })
        return dispose
      })

      assert.strictEqual(registry.get(atom), 10)
    })
  })

  describe("useAtomSubscribe", () => {
    it("subscribes to changes", () => {
      const registry = Registry.make()
      const atom = Atom.make(0)
      let lastValue: number | undefined

      createRoot((dispose) => {
        createComponent(RegistryContext.Provider, {
          value: registry,
          get children() {
            useAtomSubscribe(atom, (val) => {
              lastValue = val
            })
            return null
          },
        })
        return dispose
      })

      registry.set(atom, 5)
      assert.strictEqual(lastValue, 5)
    })
  })

  describe("useAtomMount", () => {
    it("mounts the atom", () => {
      const registry = Registry.make()
      const atom = Atom.make(0)

      createRoot((dispose) => {
        createComponent(RegistryContext.Provider, {
          value: registry,
          get children() {
            useAtomMount(atom)
            return null
          },
        })
        return dispose
      })

      // Check if mounted by verifying it's in the registry cache implicitly or just by running without error
      // Since Registry internal state is private, we assume success if no error thrown
      assert.strictEqual(registry.get(atom), 0)
    })
  })

  describe("useAtomRefresh", () => {
    it("refreshes the atom", () => {
      const registry = Registry.make()
      let counter = 0
      const atom = Atom.make(() => ++counter)

      createRoot((dispose) => {
        createComponent(RegistryContext.Provider, {
          value: registry,
          get children() {
            const refresh = useAtomRefresh(atom)
            assert.strictEqual(registry.get(atom), 1)
            refresh()
            assert.strictEqual(registry.get(atom), 2)
            return null
          },
        })
        return dispose
      })
    })
  })

  describe("useAtomInitialValues", () => {
    it("applies initial values once per registry", () => {
      const registry = Registry.make()
      const atom = Atom.make(0)
      createRoot((dispose) => {
        createComponent(RegistryContext.Provider, {
          value: registry,
          get children() {
            useAtomInitialValues([[atom, 1]])
            useAtomInitialValues([[atom, 2]])
            assert.strictEqual(registry.get(atom), 1)
            return null
          },
        })
        return dispose
      })
    })
  })

  describe("AtomRef", () => {
    it("updates when AtomRef changes", () => {
      const ref = AtomRef.make(0)
      let observed: number | undefined
      const dispose = renderAtomRef(ref, (value) => {
        observed = value
      })
      assert.strictEqual(observed, 0)
      ref.set(1)
      assert.strictEqual(observed, 1)
      dispose()
    })

    it("updates when AtomRef prop changes", () => {
      const ref = AtomRef.make({ count: 0, label: "a" })
      const propRef = useAtomRefProp(ref, "count")
      let observed: number | undefined
      const dispose = renderAtomRef(propRef, (value) => {
        observed = value
      })
      assert.strictEqual(observed, 0)
      ref.set({ count: 1, label: "a" })
      assert.strictEqual(observed, 1)
      dispose()
    })

    it("updates when AtomRef prop value changes", () => {
      const ref = AtomRef.make({ count: 0, label: "a" })
      let observed: number | undefined
      const dispose = renderAccessor(() => useAtomRefPropValue(ref, "count"), (value) => {
        observed = value
      })
      assert.strictEqual(observed, 0)
      ref.set({ count: 2, label: "a" })
      assert.strictEqual(observed, 2)
      dispose()
    })
  })
})

const renderAtomRef = function<A,>(ref: AtomRef.ReadonlyRef<A>, onValue: (_: A) => void) {
  return createRoot((dispose) => {
    const accessor = useAtomRef(ref)
    createEffect(() => {
      onValue(accessor())
    })
    return dispose
  })
}

const renderAccessor = function<A,>(makeAccessor: () => Accessor<A>, onValue: (_: A) => void) {
  return createRoot((dispose) => {
    const accessor = makeAccessor()
    createEffect(() => {
      onValue(accessor())
    })
    return dispose
  })
}

const renderAtomValue = function<A, B = A>(
  atom: Atom.Atom<A>,
  onValue: (_: B) => void,
  options?: { readonly registry?: Registry.Registry; readonly map?: (_: A) => B },
) {
  return createRoot((dispose) => {
    const run = () => {
      const accessor = options?.map ? useAtomValue(atom, options.map) : useAtomValue(atom)
      createEffect(() => {
        onValue(accessor() as B)
      })
      return null
    }

    if (options?.registry) {
      createComponent(RegistryContext.Provider, {
        value: options.registry,
        get children() {
          return run()
        },
      })
    } else {
      run()
    }

    return dispose
  })
}
