import type * as Route from "../route.js"

const ensureLeadingSlash = (value: string): string => (value.startsWith("/") ? value : `/${value}`)

export const normalizePathname = (value: string): Route.Path => {
  const pathname = ensureLeadingSlash(value)

  if (pathname === "/") {
    return "/"
  }

  const segments = pathname.split("/").filter((segment) => segment.length > 0)

  return `/${segments.join("/")}`
}

export const tokenizePath = (value: string): ReadonlyArray<string> => {
  if (value === "/") {
    return []
  }

  return value.slice(1).split("/")
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
  const url = input instanceof URL ? input : new URL(input, "https://effectify.dev")

  return {
    pathname: url.pathname,
    search: readSearch(url.searchParams),
  }
}
