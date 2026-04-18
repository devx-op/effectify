/** Placeholder Nitro integration contract for Loom. */
export interface Options {
  readonly entry?: string
}

/** Create a Nitro renderer descriptor for a later implementation batch. */
export const renderer = (options: Options = {}) => ({
  name: "effectify:loom-nitro",
  options,
})
