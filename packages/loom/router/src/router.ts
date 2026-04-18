/** Minimal router boundary for future first-class integration. */
export interface Route {
  readonly path: string
  readonly component: string
}

/** Minimal router config placeholder. */
export interface Config {
  readonly routes: ReadonlyArray<Route>
}

/** Create a router config placeholder. */
export const define = (config: Config): Config => config
