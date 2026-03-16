// DEPRECATED: HttpApi functionality removed for v4 compatibility
// TODO: Reimplement when @effect/platform v4 APIs stabilize

import * as Layer from "effect/Layer"

export type HttpApiOptions = {
  apiLive: any
  scalar?: any
}

export type RoutePath = "/" | `/${string}/`

// Stub implementation that does nothing
export const make = (_options: HttpApiOptions & { pathPrefix?: RoutePath }) => () => Layer.empty
