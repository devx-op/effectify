export type Duration = "second" | "minute" | "hour" | "day" | "week" | "month" | "year"

export interface Options {
  readonly units: number | string
  readonly key?: string
  readonly staticKey?: string
  readonly dynamicKey?: string
  readonly limit?: number | string
  readonly duration?: Duration
}

export interface RateLimit extends Readonly<Options> {
  readonly _tag: "RateLimit"
}

export const make = (options: Options): RateLimit =>
  Object.freeze({
    _tag: "RateLimit" as const,
    units: options.units,
    ...(options.key === undefined ? {} : { key: options.key }),
    ...(options.staticKey === undefined ? {} : { staticKey: options.staticKey }),
    ...(options.dynamicKey === undefined ? {} : { dynamicKey: options.dynamicKey }),
    ...(options.limit === undefined ? {} : { limit: options.limit }),
    ...(options.duration === undefined ? {} : { duration: options.duration }),
  })

export * as RateLimit from "./RateLimit.js"
