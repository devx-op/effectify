import * as Navigation from "./navigation.js"

export interface NavigateOptions<State = unknown> extends Navigation.NavigateOptions<State> {
  readonly replace?: boolean
}

export interface InterceptOptions<State = unknown> extends NavigateOptions<State> {
  readonly event: MouseEvent
  readonly currentTarget: HTMLAnchorElement
  readonly navigation: Navigation.HistoryAdapter<State>
}

export interface ModifierContext {
  readonly event: MouseEvent
  readonly currentTarget: HTMLAnchorElement
}

export interface Modifiers {
  readonly href: string
  readonly onClick: (context: ModifierContext) => boolean
}

const isModifiedEvent = (event: MouseEvent): boolean => event.metaKey || event.altKey || event.ctrlKey || event.shiftKey

const isSameOrigin = (url: URL, current: URL): boolean => url.origin === current.origin

export const href = (target: Navigation.Target, base?: string | URL): string =>
  Navigation.toUrl(target, base).toString()

export const shouldIntercept = (event: MouseEvent, currentTarget: HTMLAnchorElement, current: URL): boolean => {
  if (event.defaultPrevented || event.button !== 0 || isModifiedEvent(event)) {
    return false
  }

  if (currentTarget.hasAttribute("download")) {
    return false
  }

  const target = currentTarget.getAttribute("target")

  if (target !== null && target.length > 0 && target !== "_self") {
    return false
  }

  return isSameOrigin(new URL(currentTarget.href, current), current)
}

export const navigate = <State>(
  navigation: Navigation.HistoryAdapter<State>,
  target: Navigation.Target,
  options?: NavigateOptions<State>,
): void => {
  if (options?.replace === true) {
    navigation.replace(target, { state: options.state })
    return
  }

  navigation.push(target, { state: options?.state })
}

export const intercept = <State>(options: InterceptOptions<State>): boolean => {
  const current = options.navigation.current().url

  if (!shouldIntercept(options.event, options.currentTarget, current)) {
    return false
  }

  options.event.preventDefault()
  navigate(options.navigation, new URL(options.currentTarget.href, current), options)
  return true
}

export const modifiers = <State>(options: {
  readonly navigation: Navigation.HistoryAdapter<State>
  readonly to: Navigation.Target
  readonly replace?: boolean
  readonly state?: State
}): Modifiers => ({
  href: href(options.to, options.navigation.current().url),
  onClick: ({ event, currentTarget }) =>
    intercept({
      event,
      currentTarget,
      navigation: options.navigation,
      replace: options.replace,
      state: options.state,
    }),
})
