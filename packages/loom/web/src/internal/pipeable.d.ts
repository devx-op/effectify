import * as Pipeable from "effect/Pipeable"
export type Value<ValueShape extends object> = ValueShape & Pipeable.Pipeable
export declare const make: <ValueShape extends object>(value: ValueShape) => Value<ValueShape>
