import type { Atom } from "effect/unstable/reactivity"

type Collector = Set<Atom.Atom<unknown>>

const collectorStack: Array<Collector> = []

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
