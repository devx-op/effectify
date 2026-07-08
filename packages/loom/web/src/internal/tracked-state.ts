import type { Atom } from "effect/unstable/reactivity"

const loomStateAccessorSymbol = Symbol.for("@effectify/loom/state-accessor")

export type StateAccessor<Value> = (() => Value) & {
  readonly [loomStateAccessorSymbol]: true
}

type Collector = Set<Atom.Atom<unknown>>

const collectorStack: Array<Collector> = []

export const brandStateAccessor = <Value>(accessor: () => Value): StateAccessor<Value> => {
  Object.defineProperty(accessor, loomStateAccessorSymbol, {
    value: true,
    enumerable: false,
    configurable: false,
  })

  return accessor as StateAccessor<Value>
}

export const isStateAccessor = (value: unknown): value is StateAccessor<unknown> =>
  typeof value === "function" && value.length === 0 && loomStateAccessorSymbol in value

export const trackStateAtomRead = (atom: Atom.Atom<unknown>): void => {
  collectorStack.at(-1)?.add(atom)
}

export const withStateTracking = <Value>(render: () => Value): {
  readonly value: Value
  readonly atoms: ReadonlySet<Atom.Atom<unknown>>
} => {
  const atoms: Collector = new Set()
  collectorStack.push(atoms)

  try {
    return {
      value: render(),
      atoms,
    }
  } finally {
    collectorStack.pop()
  }
}
