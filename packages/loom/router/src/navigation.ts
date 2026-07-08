export type Target = string | URL

export interface NavigateOptions<State = unknown> {
  readonly state?: State
}

export interface LocationSnapshot<State = unknown> {
  readonly url: URL
  readonly pathname: string
  readonly query: URLSearchParams
  readonly hash: string
  readonly state: State
}

export interface HistoryAdapter<State = unknown> {
  current(): LocationSnapshot<State>
  subscribe(listener: (snapshot: LocationSnapshot<State>) => void): () => void
  push(target: Target, options?: NavigateOptions<State>): void
  replace(target: Target, options?: NavigateOptions<State>): void
  back(): void
}

export interface BrowserWindow<State = unknown> {
  readonly location: {
    readonly href: string
    readonly origin: string
  }
  readonly history: {
    readonly state: State
    pushState(state: State | undefined, unused: string, url?: string | URL | null): void
    replaceState(state: State | undefined, unused: string, url?: string | URL | null): void
    back(): void
  }
  addEventListener(event: "popstate", listener: (event: Event) => void): void
  removeEventListener(event: "popstate", listener: (event: Event) => void): void
}

const defaultBase = "https://effectify.dev"

const normalizeBase = (base?: string | URL): URL => new URL(base ?? defaultBase)

export const toUrl = (target: Target, base?: string | URL): URL =>
  target instanceof URL ? new URL(target) : new URL(target, normalizeBase(base))

export const snapshot = <State>(url: URL, state: State): LocationSnapshot<State> => ({
  url,
  pathname: url.pathname,
  query: new URLSearchParams(url.search),
  hash: url.hash,
  state,
})

export const browser = <State = unknown>(window: BrowserWindow<State>): HistoryAdapter<State | undefined> => {
  const listeners = new Set<(snapshot: LocationSnapshot<State | undefined>) => void>()

  const current = (): LocationSnapshot<State | undefined> =>
    snapshot(new URL(window.location.href), window.history.state)

  const notify = () => {
    const next = current()

    for (const listener of listeners) {
      listener(next)
    }
  }

  return {
    current,
    subscribe: (listener) => {
      const onPopState = () => {
        listener(current())
      }

      listeners.add(listener)
      window.addEventListener("popstate", onPopState)

      return () => {
        listeners.delete(listener)
        window.removeEventListener("popstate", onPopState)
      }
    },
    push: (target, options) => {
      const next = toUrl(target, window.location.href)

      window.history.pushState(options?.state, "", next)
      notify()
    },
    replace: (target, options) => {
      const next = toUrl(target, window.location.href)

      window.history.replaceState(options?.state, "", next)
      notify()
    },
    back: () => {
      window.history.back()
    },
  }
}

export const memory = <State = unknown>(
  initial: Target,
  options?: NavigateOptions<State>,
): HistoryAdapter<State | undefined> => {
  const listeners = new Set<(snapshot: LocationSnapshot<State | undefined>) => void>()
  const entries: Array<LocationSnapshot<State | undefined>> = [snapshot(toUrl(initial), options?.state)]
  let index = 0

  const current = (): LocationSnapshot<State | undefined> => entries[index] ?? entries[0]!

  const notify = () => {
    const next = current()

    for (const listener of listeners) {
      listener(next)
    }
  }

  return {
    current,
    subscribe: (listener) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    push: (target, pushOptions) => {
      const next = snapshot(toUrl(target, current().url), pushOptions?.state)

      entries.splice(index + 1)
      entries.push(next)
      index = entries.length - 1
      notify()
    },
    replace: (target, replaceOptions) => {
      entries[index] = snapshot(toUrl(target, current().url), replaceOptions?.state)
      notify()
    },
    back: () => {
      if (index === 0) {
        return
      }

      index -= 1
      notify()
    },
  }
}
