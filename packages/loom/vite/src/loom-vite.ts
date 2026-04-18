/** Placeholder Vite integration contract for Loom. */
export interface Options {
  readonly entry?: string
}

/**
 * Create a Loom Vite plugin descriptor.
 * The real Vite plugin implementation belongs in a later batch.
 */
export const loom = (options: Options = {}) => ({
  name: "effectify:loom",
  options,
})
