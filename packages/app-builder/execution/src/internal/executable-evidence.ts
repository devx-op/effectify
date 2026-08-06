import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"

export interface Entry {
  readonly revision: number
  readonly state: string
  readonly digest: string
}

export interface Observer {
  readonly read: Effect.Effect<ReadonlyArray<Entry>>
  readonly append: (entries: ReadonlyArray<Entry>) => Effect.Effect<void>
}

export const make = (): Effect.Effect<Observer> =>
  Ref.make<ReadonlyArray<Entry>>([]).pipe(
    Effect.map((entries) => ({
      read: Ref.get(entries),
      append: (next) => Ref.update(entries, (current) => [...current, ...next]),
    })),
  )

/** Records executor evidence before cleanup can remove the durable run tree. */
export const publish = (observer: Observer, entries: ReadonlyArray<Entry>): Effect.Effect<void> =>
  observer.append(entries)
