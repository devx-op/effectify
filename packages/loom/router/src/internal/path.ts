import type * as Route from "../route.js"

const ensureLeadingSlash = (value: string): string => (value.startsWith("/") ? value : `/${value}`)

const defaultBase = "https://effectify.dev"

export const normalizePathname = (value: string): Route.AbsolutePath => {
  const pathname = ensureLeadingSlash(value)

  if (pathname === "/") {
    return "/"
  }

  const segments = pathname.split("/").filter((segment) => segment.length > 0)

  return `/${segments.join("/")}`
}

export const joinPathnames = (prefix: string, path: string): Route.AbsolutePath => {
  const normalizedPrefix = normalizePathname(prefix)
  const normalizedPath = normalizePathname(path)

  if (normalizedPrefix === "/") {
    return normalizedPath
  }

  if (normalizedPath === "/") {
    return normalizedPrefix
  }

  return normalizePathname(`${normalizedPrefix}/${normalizedPath.slice(1)}`)
}

export const tokenizePath = (value: string): ReadonlyArray<string> => {
  if (value === "/") {
    return []
  }

  return value.slice(1).split("/")
}

const encodePathSegment = (segment: string, params: Route.Params): string => {
  if (!segment.startsWith(":")) {
    return segment
  }

  const name = segment.slice(1)
  const value = params[name]

  if (value === undefined) {
    throw new Error(`Missing route param: ${name}`)
  }

  return encodeURIComponent(value)
}

export const encodePathname = (pathname: Route.AbsolutePath, params: Route.Params = {}): Route.AbsolutePath => {
  if (pathname === "/") {
    return "/"
  }

  const encodedSegments = tokenizePath(pathname).map((segment) => encodePathSegment(segment, params))

  return normalizePathname(`/${encodedSegments.join("/")}`)
}

const appendSearchValue = (search: URLSearchParams, key: string, value: Route.SearchValue): void => {
  if (typeof value !== "string") {
    for (const entry of value) {
      search.append(key, entry)
    }

    return
  }

  search.set(key, value)
}

export const encodeSearch = (input: Route.Search = {}): URLSearchParams => {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(input)) {
    appendSearchValue(search, key, value)
  }

  return search
}

export const normalizeHash = (value?: string): string => {
  if (value === undefined || value.length === 0) {
    return ""
  }

  return value.startsWith("#") ? value : `#${value}`
}

export const buildUrl = (options: {
  readonly pathname: Route.AbsolutePath
  readonly params?: Route.Params
  readonly search?: Route.Search
  readonly hash?: string
}, base?: string | URL): URL => {
  const url = new URL(encodePathname(options.pathname, options.params), base ?? defaultBase)
  const search = encodeSearch(options.search)

  url.search = search.toString()
  url.hash = normalizeHash(options.hash)

  return url
}

const readSearchValue = (search: URLSearchParams, key: string): Route.SearchValue => {
  const values = search.getAll(key)

  if (values.length <= 1) {
    return values[0] ?? ""
  }

  return values
}

const readSearch = (search: URLSearchParams): Route.Search => {
  const entries: Record<string, Route.SearchValue> = {}

  for (const key of search.keys()) {
    if (!(key in entries)) {
      entries[key] = readSearchValue(search, key)
    }
  }

  return entries
}

export const parseLocation = (input: string | URL): { readonly pathname: string; readonly search: Route.Search } => {
  const url = input instanceof URL ? input : new URL(input, defaultBase)

  return {
    pathname: url.pathname,
    search: readSearch(url.searchParams),
  }
}
