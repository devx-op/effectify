import * as Pipeable from "effect/Pipeable"
export const make = (value) => Object.assign(Object.create(Pipeable.Prototype), value)
