/** Runtime hydration attribute contract shared by public and internal layers. */
export declare const attributeName = "data-loom-hydrate"
/** Stable boundary id attribute emitted during SSR. */
export declare const boundaryIdAttributeName = "data-loom-boundary"
/** Stable event registry attribute emitted during SSR. */
export declare const eventNamesAttributeName = "data-loom-events"
/** Stable node id attribute emitted for interactive elements inside a boundary. */
export declare const nodeIdAttributeName = "data-loom-node"
/** Stable per-node event metadata attribute emitted during SSR. */
export declare const nodeEventNamesAttributeName = "data-loom-node-events"
/** Comment marker prefix used for SSR/client hydration handshakes. */
export declare const markerPrefix = "loom-hydrate"
/** Comment marker prefix used for SSR/client live-region handshakes. */
export declare const liveMarkerPrefix = "loom-live"
/** Runtime hydration strategies supported by the public API skeleton. */
export type StrategyName = "visible" | "idle" | "interaction" | "manual"
export interface Marker {
  readonly strategy: StrategyName
  readonly attributeName: typeof attributeName
  readonly attributeValue: string
}
/** Create a runtime hydration marker descriptor. */
export declare const marker: (strategy: StrategyName) => Marker
/** Create the SSR start marker text for a hydratable boundary. */
export declare const startMarker: (id: string) => string
/** Create the SSR end marker text for a hydratable boundary. */
export declare const endMarker: (id: string) => string
/** Normalize event names for SSR metadata. */
export declare const formatEventNames: (events: ReadonlyArray<string>) => string
/** Parse event names from SSR metadata. */
export declare const parseEventNames: (value: string) => ReadonlyArray<string>
