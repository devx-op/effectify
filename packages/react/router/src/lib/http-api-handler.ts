import * as Layer from "effect/Layer"

export type HttpApiOptions = {
  apiLive: any
  scalar?: any
}

export type RoutePath = "/" | `/${string}/`

// Stub implementation that does nothing
export const make = (_options: HttpApiOptions & { pathPrefix?: RoutePath }) => () => Layer.empty
