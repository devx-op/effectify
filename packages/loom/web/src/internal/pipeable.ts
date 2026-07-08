import * as Pipeable from "effect/Pipeable"

export type Value<ValueShape extends object> = ValueShape & Pipeable.Pipeable

export const make = <ValueShape extends object>(value: ValueShape): Value<ValueShape> =>
  Object.assign(Object.create(Pipeable.Prototype), value)
