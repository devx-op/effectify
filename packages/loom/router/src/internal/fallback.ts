import type * as Fallback from "../fallback.js"

export interface FallbackDefinition<Content = unknown> {
  readonly _tag: "LoomRouterFallback"
  readonly content: Content
}

export const makeFallback = <Content>(content: Content): FallbackDefinition<Content> => ({
  _tag: "LoomRouterFallback",
  content,
})

export const normalizeFallbacks = (fallback: Fallback.Config | undefined): Fallback.Boundaries => {
  if (fallback === undefined) {
    return {}
  }

  return "content" in fallback ? { notFound: fallback } : fallback
}
