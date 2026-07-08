import type { Atom } from "effect/unstable/reactivity"
export declare const trackStateAtomRead: (atom: Atom.Atom<unknown>) => void
export declare const withStateTracking: <Value>(render: () => Value) => {
  readonly value: Value
  readonly atoms: ReadonlySet<Atom.Atom<unknown>>
}
