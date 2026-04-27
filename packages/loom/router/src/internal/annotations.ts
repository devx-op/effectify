import type * as Context from "effect/Context"

export type Annotations = ReadonlyMap<string, unknown>

export const emptyAnnotations = (): Annotations => new Map()

export const mergeAnnotations = (left: Annotations, right: Annotations): Annotations => new Map([...left, ...right])

export const annotateValue = <I, S>(annotations: Annotations, tag: Context.Service<I, S>, value: S): Annotations => {
  const next = new Map(annotations)

  next.set(tag.key, value)

  return next
}

export const getAnnotation = <I, S>(annotations: Annotations, tag: Context.Service<I, S>): unknown =>
  annotations.get(tag.key)
