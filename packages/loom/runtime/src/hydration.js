/** Runtime hydration attribute contract shared by public and internal layers. */
export const attributeName = "data-loom-hydrate"
/** Stable boundary id attribute emitted during SSR. */
export const boundaryIdAttributeName = "data-loom-boundary"
/** Stable event registry attribute emitted during SSR. */
export const eventNamesAttributeName = "data-loom-events"
/** Stable node id attribute emitted for interactive elements inside a boundary. */
export const nodeIdAttributeName = "data-loom-node"
/** Stable per-node event metadata attribute emitted during SSR. */
export const nodeEventNamesAttributeName = "data-loom-node-events"
/** Comment marker prefix used for SSR/client hydration handshakes. */
export const markerPrefix = "loom-hydrate"
/** Comment marker prefix used for SSR/client live-region handshakes. */
export const liveMarkerPrefix = "loom-live"
/** Create a runtime hydration marker descriptor. */
export const marker = (strategy) => ({
  strategy,
  attributeName,
  attributeValue: strategy,
})
/** Create the SSR start marker text for a hydratable boundary. */
export const startMarker = (id) => `${markerPrefix}-start:${id}`
/** Create the SSR end marker text for a hydratable boundary. */
export const endMarker = (id) => `${markerPrefix}-end:${id}`
/** Normalize event names for SSR metadata. */
export const formatEventNames = (events) =>
  [...new Set(events)].sort((left, right) => left.localeCompare(right)).join(",")
/** Parse event names from SSR metadata. */
export const parseEventNames = (value) =>
  value
    .split(",")
    .map((eventName) => eventName.trim())
    .filter((eventName) => eventName.length > 0)
